// ==============================================================================
// LIC v2 — UpdateEntiteUseCase (Phase 4 étape 4.C)
//
// Patch nom + codePays. Vérifie conflit UNIQUE (clientId, nom) si nom change.
// Audit ENTITE_UPDATED dans même tx.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type EntiteDTO } from "../adapters/postgres/entite.mapper";
import { entiteNomAlreadyExists, entiteNotFoundById } from "../domain/entite.errors";
import type { EntiteRepository } from "../ports/entite.repository";

export interface UpdateEntiteUseCaseInput {
  readonly entiteId: string;
  readonly nom?: string;
  readonly codePays?: string | null;
}

export interface UpdateEntiteUseCaseOutput {
  readonly entite: EntiteDTO;
}

export class UpdateEntiteUseCase {
  constructor(
    private readonly entiteRepository: EntiteRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: UpdateEntiteUseCaseInput,
    actorId: string,
  ): Promise<UpdateEntiteUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.entiteRepository.findById(input.entiteId, tx);
      if (existing === null) {
        throw entiteNotFoundById(input.entiteId);
      }

      const patched = existing.withProfile({
        nom: input.nom,
        codePays: input.codePays,
      });

      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      if (patched.nom !== existing.nom) {
        before.nom = existing.nom;
        after.nom = patched.nom;

        // UNIQUE (client_id, nom) — vérif business avant Postgres
        const collision = await this.entiteRepository.findByClientAndNom(
          existing.clientId,
          patched.nom,
          tx,
        );
        if (collision !== null && collision.id !== existing.id) {
          throw entiteNomAlreadyExists(existing.clientId, patched.nom);
        }
      }
      if (patched.codePays !== existing.codePays) {
        before.codePays = existing.codePays;
        after.codePays = patched.codePays;
      }

      if (Object.keys(after).length === 0) return existing;

      await this.entiteRepository.update(patched, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "entite",
        entityId: existing.id,
        action: "ENTITE_UPDATED",
        beforeData: before,
        afterData: after,
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        // clientId omis (cf. R-33). Tracé indirectement via entityId → entite.client_id.
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return { entite: toDTO(updated) };
  }
}
