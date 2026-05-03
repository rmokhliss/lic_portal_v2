// ==============================================================================
// LIC v2 — UpdateClientUseCase (Phase 4 étape 4.B)
//
// Patch profil hors statut. Optimistic locking via expectedVersion (règle L4) :
// le repo throw SPX-LIC-728 si la version BD diverge.
//
// Orchestration transactionnelle :
//   1. db.transaction:
//      a. findById(userId) → throw SPX-LIC-724 si null
//      b. existing.withProfile(patch) → throw SPX-LIC-726 si validation
//      c. clientRepository.update(patched, expectedVersion, actorId, tx)
//         → throw SPX-LIC-728 si conflit version
//      d. audit CLIENT_UPDATED avec diff réel (champs modifiés uniquement)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { clientNotFoundById } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

export interface UpdateClientUseCaseInput {
  readonly clientId: string;
  readonly expectedVersion: number;
  readonly raisonSociale?: string;
  readonly nomContact?: string | null;
  readonly emailContact?: string | null;
  readonly telContact?: string | null;
  readonly codePays?: string | null;
  readonly codeDevise?: string | null;
  readonly codeLangue?: string | null;
  readonly salesResponsable?: string | null;
  readonly accountManager?: string | null;
  readonly dateSignatureContrat?: string | null;
  readonly dateMiseEnProd?: string | null;
  readonly dateDemarrageSupport?: string | null;
  readonly prochaineDateRenouvellementSupport?: string | null;
}

export interface UpdateClientUseCaseOutput {
  readonly client: ClientDTO;
}

export class UpdateClientUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: UpdateClientUseCaseInput,
    actorId: string,
  ): Promise<UpdateClientUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.clientRepository.findById(input.clientId, tx);
      if (existing === null) {
        throw clientNotFoundById(input.clientId);
      }

      const patch = {
        raisonSociale: input.raisonSociale,
        nomContact: input.nomContact,
        emailContact: input.emailContact,
        telContact: input.telContact,
        codePays: input.codePays,
        codeDevise: input.codeDevise,
        codeLangue: input.codeLangue,
        salesResponsable: input.salesResponsable,
        accountManager: input.accountManager,
        dateSignatureContrat: input.dateSignatureContrat,
        dateMiseEnProd: input.dateMiseEnProd,
        dateDemarrageSupport: input.dateDemarrageSupport,
        prochaineDateRenouvellementSupport: input.prochaineDateRenouvellementSupport,
      };
      const patched = existing.withProfile(patch);

      // Diff before/after pour l'audit (uniquement les champs réellement
      // changés, comparaison shallow).
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      const compareFields: readonly (keyof typeof patch)[] = [
        "raisonSociale",
        "nomContact",
        "emailContact",
        "telContact",
        "codePays",
        "codeDevise",
        "codeLangue",
        "salesResponsable",
        "accountManager",
        "dateSignatureContrat",
        "dateMiseEnProd",
        "dateDemarrageSupport",
        "prochaineDateRenouvellementSupport",
      ];
      for (const f of compareFields) {
        if (existing[f] !== patched[f]) {
          before[f] = existing[f];
          after[f] = patched[f];
        }
      }

      if (Object.keys(after).length === 0) {
        // No-op : retourne l'existant sans UPDATE ni audit.
        return existing;
      }

      const persisted = await this.clientRepository.update(
        patched,
        input.expectedVersion,
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
        entity: "client",
        entityId: persisted.id,
        action: "CLIENT_UPDATED",
        beforeData: before,
        afterData: after,
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        clientId: persisted.id,
        clientDisplay: `${persisted.codeClient} — ${persisted.raisonSociale}`,
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return persisted;
    });

    return { client: toDTO(updated) };
  }
}
