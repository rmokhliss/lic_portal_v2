// ==============================================================================
// LIC v2 — DeleteCAUseCase (Phase 24)
//
// Action SADMIN destructive : supprime la CA S2M de `lic_settings` ET nullifie
// les 3 colonnes PKI (`client_private_key_enc` / `client_certificate_pem` /
// `client_certificate_expires_at`) sur tous les `lic_clients`.
//
// Garde-fou métier critique : la suppression est BLOQUÉE si au moins un
// fichier `.lic` a déjà été généré (count `lic_fichiers_log` type=LIC_GENERATED
// > 0). Rationale : un `.lic` est signé par la CA — supprimer la CA après
// génération invalide la traçabilité de tous les artefacts livrés au client.
// Une régénération de CA dans ce contexte est un changement majeur qui doit
// passer par un workflow dédié (hors scope).
//
// Audit `CA_DELETED` dans la même transaction (règle L3) — la trace de
// suppression survit même si le record CA disparaît.
//
// Throws :
//   SPX-LIC-411 si aucune CA n'est présente (rien à supprimer)
//   SPX-LIC-412 si des `.lic` ont déjà été générés (suppression interdite)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import type { ClientRepository } from "@/server/modules/client/ports/client.repository";
import { ConflictError, InternalError, ValidationError } from "@/server/modules/error";
import type { FichierLogRepository } from "@/server/modules/fichier-log/ports/fichier-log.repository";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { CA_SETTING_KEY, isCARecord } from "./__shared/ca-storage";

export interface DeleteCAOutput {
  /** subjectCN de la CA qui vient d'être supprimée (utile pour le retour UI). */
  readonly subjectCN: string;
  /** Nombre de clients dont les colonnes PKI ont été nullifiées. */
  readonly clientsAffected: number;
}

export class DeleteCAUseCase {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly clientRepository: ClientRepository,
    private readonly fichierLogRepository: FichierLogRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(actorId: string): Promise<DeleteCAOutput> {
    // 1. Pré-checks hors tx — coûteux et idéal pour le retour utilisateur
    //    rapide sans verrouiller la table settings.
    const allSettings = await this.settingRepository.findAll();
    const ca = allSettings.find((s) => s.key === CA_SETTING_KEY);
    if (ca === undefined || !isCARecord(ca.value)) {
      throw new ValidationError({
        code: "SPX-LIC-411",
        message: "Aucune CA S2M à supprimer.",
      });
    }
    const subjectCN = ca.value.subjectCN;

    const licCount = await this.fichierLogRepository.countByType("LIC_GENERATED");
    if (licCount > 0) {
      throw new ConflictError({
        code: "SPX-LIC-412",
        message:
          `Suppression CA bloquée — ${String(licCount)} fichier(s) .lic ont déjà été générés. ` +
          "Une régénération de CA après génération de .lic est un changement majeur " +
          "(invalide la chaîne de confiance des artefacts livrés) — workflow dédié requis.",
        details: { licCount },
      });
    }

    // 2. Suppression + nullify + audit dans une seule transaction (règle L3).
    return await db.transaction(async (tx) => {
      // Re-check inside tx pour fermer la fenêtre TOCTOU avec un autre admin
      // qui aurait généré un .lic ou supprimé la CA entre temps.
      const insideCount = await this.fichierLogRepository.countByType("LIC_GENERATED", tx);
      if (insideCount > 0) {
        throw new ConflictError({
          code: "SPX-LIC-412",
          message: `Suppression CA bloquée (race detected — ${String(insideCount)} .lic).`,
        });
      }
      const insideSettings = await this.settingRepository.findAll(tx);
      if (!insideSettings.some((s) => s.key === CA_SETTING_KEY)) {
        throw new ValidationError({
          code: "SPX-LIC-411",
          message: "Aucune CA S2M à supprimer (race detected).",
        });
      }

      // Bulk nullify des 3 colonnes PKI sur tous les clients.
      const clientsAffected = await this.clientRepository.nullifyAllCertificates(tx);

      // DELETE de la clé settings.
      await this.settingRepository.deleteByKey(CA_SETTING_KEY, tx);

      // Audit (entité=pki, singleton UUID).
      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }
      // Re-narrow : `findAll` retourne Setting[] dont value: unknown ; le
      // isCARecord pré-check au-dessus a confirmé le shape sur `ca.value`,
      // mais TS ne propage pas la garde via la variable intermédiaire.
      const caValue = ca.value as { subjectCN: string; expiresAt: string; generatedAt: string };
      const entry = AuditEntry.create({
        entity: "pki",
        entityId: "00000000-0000-0000-0000-000000000001",
        action: "CA_DELETED",
        beforeData: {
          subjectCN: caValue.subjectCN,
          expiresAt: caValue.expiresAt,
          generatedAt: caValue.generatedAt,
        },
        afterData: { clientsAffected },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return { subjectCN, clientsAffected };
    });
  }
}
