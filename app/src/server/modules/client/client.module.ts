// ==============================================================================
// LIC v2 — Composition root du module client (Phase 4 étape 4.B)
//
// Exporte uniquement les singletons read-only et le repository (pour cross-
// module via composition-root.ts). Les 4 use-cases mutateurs (create, update,
// changeStatus, et leur miroir) DÉPENDENT du module audit + module user
// (résolution actor pour L9) → câblés dans composition-root.ts.
// ==============================================================================

import { ClientRepositoryPg } from "./adapters/postgres/client.repository.pg";
import { GetClientUseCase } from "./application/get-client.usecase";
import { ListClientsUseCase } from "./application/list-clients.usecase";
import type { ClientRepository } from "./ports/client.repository";

export const clientRepository: ClientRepository = new ClientRepositoryPg();

export const getClientUseCase = new GetClientUseCase(clientRepository);
export const listClientsUseCase = new ListClientsUseCase(clientRepository);
