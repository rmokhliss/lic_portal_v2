// ==============================================================================
// LIC v2 — ChangeClientStatusUseCase (Phase 4 étape 4.B)
//
// Bascule statut client. Règle métier : RESILIE est terminal (cf.
// Client.canTransition). Optimistic locking via expectedVersion.
//
// Audit codes selon transition cible :
//   - PROSPECT → ACTIF       : CLIENT_ACTIVATED
//   - ACTIF → SUSPENDU       : CLIENT_SUSPENDED
//   - SUSPENDU → ACTIF       : CLIENT_REACTIVATED
//   - * → RESILIE            : CLIENT_TERMINATED
//   - autres                 : CLIENT_STATUS_CHANGED (fallback)
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { Client, type ClientStatut } from "../domain/client.entity";
import { clientNotFoundById, clientStatusTransitionForbidden } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

export interface ChangeClientStatusUseCaseInput {
  readonly clientId: string;
  readonly expectedVersion: number;
  readonly newStatus: ClientStatut;
}

export interface ChangeClientStatusUseCaseOutput {
  readonly client: ClientDTO;
}

function pickAuditAction(from: ClientStatut, to: ClientStatut): string {
  if (to === "RESILIE") return "CLIENT_TERMINATED";
  if (from === "PROSPECT" && to === "ACTIF") return "CLIENT_ACTIVATED";
  if (from === "ACTIF" && to === "SUSPENDU") return "CLIENT_SUSPENDED";
  if (from === "SUSPENDU" && to === "ACTIF") return "CLIENT_REACTIVATED";
  return "CLIENT_STATUS_CHANGED";
}

export class ChangeClientStatusUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ChangeClientStatusUseCaseInput,
    actorId: string,
  ): Promise<ChangeClientStatusUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.clientRepository.findById(input.clientId, tx);
      if (existing === null) {
        throw clientNotFoundById(input.clientId);
      }

      if (!Client.canTransition(existing.statutClient, input.newStatus)) {
        throw clientStatusTransitionForbidden(existing.statutClient, input.newStatus);
      }

      const patched = existing.withStatus(input.newStatus);
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
        action: pickAuditAction(existing.statutClient, input.newStatus),
        beforeData: { statutClient: existing.statutClient },
        afterData: { statutClient: input.newStatus },
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
