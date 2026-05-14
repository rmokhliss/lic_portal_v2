// ==============================================================================
// LIC v2 — Composition root du module clients-ref (Phase 24)
//
// Référentiel lecture seule (ADR 0017, R-27). Exclu de l'audit obligatoire —
// pas de cross-module nécessaire, câblage direct dans ce <X>.module.ts.
// ==============================================================================

import { ClientRefRepositoryPg } from "./adapters/postgres/client-ref.repository.pg";
import { ListClientsRefUseCase } from "./application/list-clients-ref.usecase";
import { SearchClientsRefUseCase } from "./application/search-clients-ref.usecase";
import type { ClientRefRepository } from "./ports/client-ref.repository";

export const clientRefRepository: ClientRefRepository = new ClientRefRepositoryPg();

export const listClientsRefUseCase = new ListClientsRefUseCase(clientRefRepository);
export const searchClientsRefUseCase = new SearchClientsRefUseCase(clientRefRepository);
