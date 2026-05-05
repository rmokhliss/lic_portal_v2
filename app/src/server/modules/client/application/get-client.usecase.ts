// ==============================================================================
// LIC v2 — GetClientUseCase (Phase 4.B + Phase 16 audit lectures sensibles)
//
// Phase 16 — DETTE-LIC-022 résolue : si `actorId` est fourni ET que les ports
// audit/user sont câblés (cf. composition-root.ts), émet un audit CLIENT_READ
// best-effort (try/catch, log warn sur échec — pas de propagation à l'appelant).
//
// Rétrocompatible : sans actorId, comportement Phase 4.B inchangé (no-audit).
// Les callers qui n'ont pas de session (jobs, scripts) restent inchangés.
// ==============================================================================

import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";
import { createChildLogger } from "@/server/infrastructure/logger";

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { clientNotFoundById } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

const log = createChildLogger("get-client");

export class GetClientUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    /** Phase 16 — optionnels pour rétrocompat. Câblés en composition-root. */
    private readonly auditRepository?: AuditRepository,
    private readonly userRepository?: UserRepository,
  ) {}

  async execute(id: string, actorId?: string): Promise<ClientDTO> {
    const client = await this.clientRepository.findById(id);
    if (client === null) {
      throw clientNotFoundById(id);
    }

    // Phase 16 — audit best-effort CLIENT_READ.
    if (
      actorId !== undefined &&
      this.auditRepository !== undefined &&
      this.userRepository !== undefined
    ) {
      try {
        const actor = await this.userRepository.findByIdEntity(actorId);
        if (actor !== null) {
          const entry = AuditEntry.create({
            entity: "client",
            entityId: client.id,
            action: "CLIENT_READ",
            userId: actor.id,
            userDisplay: actor.toDisplay(),
            clientId: client.id,
            clientDisplay: `${client.codeClient} — ${client.raisonSociale}`,
            mode: "MANUEL",
          });
          await this.auditRepository.save(entry);
        }
      } catch (err) {
        log.warn(
          {
            event: "audit_read_failed",
            entityId: client.id,
            error: err instanceof Error ? err.message : String(err),
          },
          "Échec audit CLIENT_READ best-effort (lecture client OK)",
        );
      }
    }

    return toDTO(client);
  }
}
