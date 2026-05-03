// ==============================================================================
// LIC v2 — Composition root du module pays (Phase 2.B étape 3/7)
//
// Réplique du pattern regions.module.ts. Aucun audit, aucun cross-module —
// les 5 use-cases câblés directement.
// ==============================================================================

import { PaysRepositoryPg } from "./adapters/postgres/pays.repository.pg";
import { CreatePaysUseCase } from "./application/create-pays.usecase";
import { GetPaysUseCase } from "./application/get-pays.usecase";
import { ListPaysUseCase } from "./application/list-pays.usecase";
import { TogglePaysUseCase } from "./application/toggle-pays.usecase";
import { UpdatePaysUseCase } from "./application/update-pays.usecase";
import type { PaysRepository } from "./ports/pays.repository";

export const paysRepository: PaysRepository = new PaysRepositoryPg();

export const listPaysUseCase = new ListPaysUseCase(paysRepository);
export const getPaysUseCase = new GetPaysUseCase(paysRepository);
export const createPaysUseCase = new CreatePaysUseCase(paysRepository);
export const updatePaysUseCase = new UpdatePaysUseCase(paysRepository);
export const togglePaysUseCase = new TogglePaysUseCase(paysRepository);
