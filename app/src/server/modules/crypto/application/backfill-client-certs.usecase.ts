// ==============================================================================
// LIC v2 — BackfillClientCertificatesUseCase (Phase 3.E)
//
// Itère les clients sans certificat (`client_certificate_pem IS NULL`), génère
// pour chacun une paire RSA-4096 + cert client signé par la CA, chiffre la clé
// privée AES-GCM, persiste les 3 colonnes PKI, audite CERTIFICATE_ISSUED en
// mode SCRIPT.
//
// Utilisé :
//   - Server Action `backfillClientCertsAction` (UI /settings/security)
//   - Script `pnpm script:backfill-client-certs` (CLI one-shot)
//
// Idempotent : un 2e run après backfill complet ne fait rien (filtre IS NULL).
// ==============================================================================

import { sql as drizzleSql, eq, isNull } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { clients } from "@/server/modules/client/adapters/postgres/schema";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";

import { encryptAes256Gcm } from "../domain/aes";
import { generateRsaKeyPair } from "../domain/rsa";
import { generateClientCert, getCertExpiry } from "../domain/x509";
import { caAbsentOrInvalid } from "../domain/x509.errors";

import { CA_SETTING_KEY, isCARecord, unwrapCAPrivateKey } from "./__shared/ca-storage";

export interface BackfillInput {
  /** APP_MASTER_KEY pour chiffrer les nouvelles clés privées clients. */
  readonly appMasterKey: string;
  /** ID utilisateur SYSTEM (audit_log.user_id). Le mode='SCRIPT' est forcé. */
  readonly systemUserId: string;
  readonly systemUserDisplay: string;
}

export interface BackfillProgress {
  readonly processed: number;
  readonly skipped: number;
  readonly failed: readonly { clientId: string; codeClient: string; error: string }[];
}

export class BackfillClientCertificatesUseCase {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async countPending(): Promise<number> {
    const rows = await db
      .select({ c: drizzleSql<number>`count(*)::int` })
      .from(clients)
      .where(isNull(clients.clientCertificatePem));
    return rows[0]?.c ?? 0;
  }

  async execute(input: BackfillInput): Promise<BackfillProgress> {
    const settings = await this.settingRepository.findAll();
    const caSetting = settings.find((s) => s.key === CA_SETTING_KEY);
    if (caSetting === undefined || !isCARecord(caSetting.value)) {
      throw caAbsentOrInvalid("CA S2M non générée. Génération préalable obligatoire.");
    }
    const caRecord = caSetting.value;
    const caPrivateKeyPem = unwrapCAPrivateKey(caRecord, input.appMasterKey);

    // Liste les clients sans cert. Volume cible MVP : ≤200, donc une seule
    // requête sans pagination est acceptable. Au-delà, paginer.
    const pending = await db
      .select({
        id: clients.id,
        codeClient: clients.codeClient,
        raisonSociale: clients.raisonSociale,
      })
      .from(clients)
      .where(isNull(clients.clientCertificatePem));

    const failed: { clientId: string; codeClient: string; error: string }[] = [];
    let processed = 0;

    for (const c of pending) {
      try {
        const keys = generateRsaKeyPair();
        const certPem = await generateClientCert({
          clientPublicKeyPem: keys.publicKeyPem,
          caPrivateKeyPem,
          caCertPem: caRecord.certificatePem,
          subject: {
            commonName: c.raisonSociale,
            org: "S2M",
            serialNumber: c.codeClient,
          },
        });
        const expiresAt = getCertExpiry(certPem);
        const privateKeyEnc = encryptAes256Gcm(keys.privateKeyPem, input.appMasterKey);

        await db.transaction(async (tx) => {
          await tx
            .update(clients)
            .set({
              clientPrivateKeyEnc: privateKeyEnc,
              clientCertificatePem: certPem,
              clientCertificateExpiresAt: expiresAt,
            })
            .where(eq(clients.id, c.id));

          const entry = AuditEntry.create({
            entity: "client",
            entityId: c.id,
            action: "CERTIFICATE_ISSUED",
            afterData: {
              subjectCN: c.raisonSociale,
              serialNumber: c.codeClient,
              expiresAt: expiresAt.toISOString(),
              backfilled: true,
            },
            userId: input.systemUserId,
            userDisplay: input.systemUserDisplay,
            clientId: c.id,
            clientDisplay: `${c.codeClient} — ${c.raisonSociale}`,
            mode: "SCRIPT",
          });
          await this.auditRepository.save(entry, tx);
        });

        processed += 1;
      } catch (err) {
        failed.push({
          clientId: c.id,
          codeClient: c.codeClient,
          error: err instanceof Error ? err.message : "erreur inconnue",
        });
      }
    }

    return {
      processed,
      skipped: 0,
      failed,
    };
  }
}
