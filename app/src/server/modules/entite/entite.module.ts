// ==============================================================================
// LIC v2 — Composition root du module entite (Phase 4 étape 4.C)
// Use-cases mutateurs (create/update/toggle) câblés dans composition-root.ts
// (dépendance audit cross-module).
// ==============================================================================

import { EntiteRepositoryPg } from "./adapters/postgres/entite.repository.pg";
import { GetEntiteUseCase } from "./application/get-entite.usecase";
import { ListEntitesByClientUseCase } from "./application/list-entites-by-client.usecase";
import type { EntiteRepository } from "./ports/entite.repository";

export const entiteRepository: EntiteRepository = new EntiteRepositoryPg();

export const getEntiteUseCase = new GetEntiteUseCase(entiteRepository);
export const listEntitesByClientUseCase = new ListEntitesByClientUseCase(entiteRepository);
