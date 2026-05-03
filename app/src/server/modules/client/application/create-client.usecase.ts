// ==============================================================================
// LIC v2 — CreateClientUseCase (Phase 4 étape 4.B — EC-Clients)
//
// Orchestration transactionnelle (règle L3 — audit dans même tx) :
//   1. Client.create(input) → throw SPX-LIC-726 si validation
//   2. db.transaction:
//      a. findByCode(codeClient) → throw SPX-LIC-725 si conflit
//      b. saveWithSiegeEntite(client, { nom: siegeNom ?? raisonSociale })
//         → INSERT lic_clients + INSERT lic_entites « Siège » dans la
//         même tx (1 client ⇒ 1 entité Siège, invariant métier)
//      c. findById(actorId) → format L9 → audit CLIENT_CREATED
//
// TODO Phase 3 (DETTE-LIC-008, ADR 0002) — à insérer ICI une fois Phase 3
// livrée :
//      d. const { publicKeyPem, privateKeyPem } = generateClientKeyPair();
//      e. const cert = signCertificateByCA(publicKeyPem, codeClient);
//      f. clientCertificateRepository.save({ clientId, cert, privateKeyEnc }, tx);
// Sans ces 3 étapes, impossible de générer un .lic signé pour ce client.
// Cf. PROJECT_CONTEXT_LIC.md §10 DETTE-LIC-008.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { Client, type CreateClientDomainInput } from "../domain/client.entity";
import { clientCodeAlreadyExists } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

export interface CreateClientUseCaseInput extends CreateClientDomainInput {
  /** Nom de l'entité « Siège » créée dans la même tx. Default = raisonSociale. */
  readonly siegeNom?: string;
}

export interface CreateClientUseCaseOutput {
  readonly client: ClientDTO;
  /** id uuid de l'entité Siège créée. */
  readonly siegeEntiteId: string;
}

export class CreateClientUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: CreateClientUseCaseInput,
    actorId: string,
  ): Promise<CreateClientUseCaseOutput> {
    // Validation domaine en amont — pas de tx ouverte si invalide.
    const candidate = Client.create(input);
    const siegeNom = input.siegeNom ?? input.raisonSociale;

    const result = await db.transaction(async (tx) => {
      const existing = await this.clientRepository.findByCode(candidate.codeClient, tx);
      if (existing !== null) {
        throw clientCodeAlreadyExists(candidate.codeClient);
      }

      const { client: persistedClient, siegeEntiteId } =
        await this.clientRepository.saveWithSiegeEntite(
          candidate,
          { nom: siegeNom, codePays: candidate.codePays ?? undefined },
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
        entityId: persistedClient.id,
        action: "CLIENT_CREATED",
        afterData: {
          ...persistedClient.toAuditSnapshot(),
          siegeEntiteId,
        },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        clientId: persistedClient.id,
        clientDisplay: `${persistedClient.codeClient} — ${persistedClient.raisonSociale}`,
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return { client: persistedClient, siegeEntiteId };
    });

    return { client: toDTO(result.client), siegeEntiteId: result.siegeEntiteId };
  }
}
