// ==============================================================================
// LIC v2 — GenerateCAUseCase (Phase 3.C)
//
// Action SADMIN one-shot : génère la CA S2M auto-signée, chiffre la clé privée
// avec APP_MASTER_KEY, persiste dans lic_settings (clé `s2m_root_ca`), et
// audite CA_GENERATED dans la même transaction (règle L3).
//
// Throws SPX-LIC-410 (ConflictError) si la CA est déjà présente. Régénération
// = opération destructive nécessitant un workflow dédié (hors scope Phase 3).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { ConflictError, InternalError } from "@/server/modules/error";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { generateRsaKeyPair } from "../domain/rsa";
import { generateCACert } from "../domain/x509";

import { CA_SETTING_KEY, isCARecord, packCARecord } from "./__shared/ca-storage";

export interface GenerateCAInput {
  /** Common Name de la CA — affiché dans le subject du cert. */
  readonly subjectCN: string;
  /** Organisation. Default `S2M`. */
  readonly org?: string;
  /** Validité en années. Default 20 (ADR 0002 + ADR 0019). */
  readonly validityYears?: number;
  /** Clé maîtresse AES-256 base64 — `env.APP_MASTER_KEY`. Injectée pour
   *  testabilité (sinon le use-case dépendrait de l'env global). */
  readonly appMasterKey: string;
}

export interface GenerateCAOutput {
  readonly certificatePem: string;
  readonly expiresAt: Date;
  readonly subjectCN: string;
}

export class GenerateCAUseCase {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: GenerateCAInput, actorId: string): Promise<GenerateCAOutput> {
    // 1. Pré-check hors tx : la CA existe-t-elle déjà ?
    const existing = await this.settingRepository.findAll();
    const ca = existing.find((s) => s.key === CA_SETTING_KEY);
    if (ca !== undefined && isCARecord(ca.value)) {
      throw new ConflictError({
        code: "SPX-LIC-410",
        message: "CA S2M déjà existante. Régénération non supportée Phase 3.",
        details: { subjectCN: ca.value.subjectCN },
      });
    }

    // 2. Génération hors tx (200-500 ms RSA + 100 ms cert) — pas de verrou BD
    //    pendant la crypto.
    const keyPair = generateRsaKeyPair();
    const certificatePem = await generateCACert({
      caPrivateKeyPem: keyPair.privateKeyPem,
      caPublicKeyPem: keyPair.publicKeyPem,
      subject: { commonName: input.subjectCN, org: input.org ?? "S2M" },
      validityYears: input.validityYears,
    });
    const record = packCARecord({
      certificatePem,
      privateKeyPem: keyPair.privateKeyPem,
      subjectCN: input.subjectCN,
      appMasterKey: input.appMasterKey,
    });

    // 3. Persistance + audit dans une seule transaction (règle L3).
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
        // CA = singleton — identifiant fixe (la table lic_audit_log.entity_id est
        // un uuid). On choisit un UUID nil-like reconnaissable.
        entityId: "00000000-0000-0000-0000-000000000001",
        action: "CA_GENERATED",
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
