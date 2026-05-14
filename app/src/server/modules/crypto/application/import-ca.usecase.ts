// ==============================================================================
// LIC v2 — ImportCAUseCase (Phase 24)
//
// Pendant de `GenerateCAUseCase` : permet à un SADMIN d'importer une CA
// existante (cert + clé privée PEM) au lieu d'en générer une nouvelle.
// Cas d'usage : reprise d'une CA déjà déployée chez le client, fusion de
// portefeuilles SELECT-PX, restauration depuis backup hors-bande.
//
// Format accepté : 2 strings PEM (privateKeyPem + certificatePem).
//
// Note Phase 24 — PKCS#12 (.p12) :
//   Non supporté nativement par node:crypto (pas d'API d'extraction publique
//   au-delà de tls.createSecureContext qui retourne un handle opaque). Une
//   dépendance crypto tierce (node-forge) est interdite par ADR 0019.
//   Workaround côté admin : convertir le .p12 en PEM via openssl CLI :
//     openssl pkcs12 -in ca.p12 -nocerts -nodes -out ca-key.pem
//     openssl pkcs12 -in ca.p12 -clcerts -nokeys  -out ca-cert.pem
//
// Validation :
//   1. Cert parsable + BasicConstraints CA=TRUE + self-signed + non expiré
//   2. Clé privée parsable
//   3. Cohérence clé privée ↔ cert (signature d'un challenge se vérifie avec
//      la clé publique du cert) — réutilise `assertCAImportable` (x509.ts)
//
// Persistance : exactement la même structure que `generate-ca.usecase`
// (clé `s2m_root_ca` dans `lic_settings`, clé privée chiffrée AES-256-GCM).
// Audit `CA_IMPORTED` dans la même transaction (règle L3).
//
// Throws SPX-LIC-410 si une CA existe déjà (pour régénérer/réimporter, il
// faut d'abord la supprimer via `DeleteCAUseCase`).
// ==============================================================================

import { X509Certificate } from "node:crypto";

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { ConflictError, InternalError } from "@/server/modules/error";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { assertCAImportable, getCertExpiry } from "../domain/x509";

import { CA_SETTING_KEY, isCARecord, type CARecord } from "./__shared/ca-storage";
import { encryptAes256Gcm } from "../domain/aes";

export interface ImportCAInput {
  /** PEM PKCS#8 de la clé privée CA (avec ou sans password — pour l'instant
   *  on n'accepte que les PEM non chiffrés ; les .p12 doivent être convertis
   *  via openssl CLI en amont, cf. header). */
  readonly privateKeyPem: string;
  /** PEM X.509 du cert CA (self-signed, BasicConstraints CA=TRUE). */
  readonly certificatePem: string;
  /** Clé maîtresse AES-256 base64 — `env.APP_MASTER_KEY`. */
  readonly appMasterKey: string;
}

export interface ImportCAOutput {
  readonly certificatePem: string;
  readonly expiresAt: Date;
  readonly subjectCN: string;
}

export class ImportCAUseCase {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: ImportCAInput, actorId: string): Promise<ImportCAOutput> {
    // 1. Pré-check hors tx : la CA existe-t-elle déjà ?
    const existing = await this.settingRepository.findAll();
    const ca = existing.find((s) => s.key === CA_SETTING_KEY);
    if (ca !== undefined && isCARecord(ca.value)) {
      throw new ConflictError({
        code: "SPX-LIC-410",
        message:
          "CA S2M déjà existante. Supprimer la CA actuelle avant d'en importer une nouvelle.",
        details: { subjectCN: ca.value.subjectCN },
      });
    }

    // 2. Validation crypto hors tx (parse + cohérence clé/cert). Throw
    //    SPX-LIC-411 (cert/clé invalides) ou SPX-LIC-422 (mismatch).
    await assertCAImportable({
      certPem: input.certificatePem,
      privateKeyPem: input.privateKeyPem,
    });

    // 3. Construction du record persistable. subjectCN extrait du cert pour
    //    éviter une divergence avec ce qu'on stocke (le user n'a pas à le
    //    re-saisir manuellement à l'import).
    const expiresAt = getCertExpiry(input.certificatePem);
    const subjectCN = extractCommonName(input.certificatePem);
    const record: CARecord = {
      certificatePem: input.certificatePem,
      privateKeyEnc: encryptAes256Gcm(input.privateKeyPem, input.appMasterKey),
      expiresAt: expiresAt.toISOString(),
      subjectCN,
      generatedAt: new Date().toISOString(),
    };

    // 4. Persistance + audit dans une seule transaction (règle L3).
    return await db.transaction(async (tx) => {
      // Re-check inside tx pour fermer la fenêtre TOCTOU avec un autre admin.
      const inside = await this.settingRepository.findAll(tx);
      if (inside.some((s) => s.key === CA_SETTING_KEY)) {
        throw new ConflictError({
          code: "SPX-LIC-410",
          message: "CA S2M déjà existante (race detected).",
        });
      }

      await this.settingRepository.upsertMany(
        [{ key: CA_SETTING_KEY, value: record }],
        actorId,
        tx,
      );

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "pki",
        entityId: "00000000-0000-0000-0000-000000000001",
        action: "CA_IMPORTED",
        afterData: {
          subjectCN: record.subjectCN,
          expiresAt: record.expiresAt,
          generatedAt: record.generatedAt,
        },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return {
        certificatePem: record.certificatePem,
        expiresAt: new Date(record.expiresAt),
        subjectCN: record.subjectCN,
      };
    });
  }
}

/** Extrait le Common Name (CN) du subject DN d'un PEM de cert. Fallback sur
 *  "Imported CA" si non trouvable. Le CN est juste un libellé d'affichage —
 *  `assertCAImportable` a déjà validé que le cert est bien parsable. */
function extractCommonName(certPem: string): string {
  try {
    const cert = new X509Certificate(certPem);
    const match = /CN=([^,\n\r]+)/.exec(cert.subject);
    return match?.[1]?.trim() ?? "Imported CA";
  } catch {
    return "Imported CA";
  }
}
