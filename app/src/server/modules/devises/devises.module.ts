// ==============================================================================
// LIC v2 — Composition root du module devises (Phase 2.B étape 3/7)
// ==============================================================================

import { DeviseRepositoryPg } from "./adapters/postgres/devise.repository.pg";
import { CreateDeviseUseCase } from "./application/create-devise.usecase";
import { GetDeviseUseCase } from "./application/get-devise.usecase";
import { ListDevisesUseCase } from "./application/list-devises.usecase";
import { ToggleDeviseUseCase } from "./application/toggle-devise.usecase";
import { UpdateDeviseUseCase } from "./application/update-devise.usecase";
import type { DeviseRepository } from "./ports/devise.repository";

export const deviseRepository: DeviseRepository = new DeviseRepositoryPg();

export const listDevisesUseCase = new ListDevisesUseCase(deviseRepository);
export const getDeviseUseCase = new GetDeviseUseCase(deviseRepository);
export const createDeviseUseCase = new CreateDeviseUseCase(deviseRepository);
export const updateDeviseUseCase = new UpdateDeviseUseCase(deviseRepository);
export const toggleDeviseUseCase = new ToggleDeviseUseCase(deviseRepository);
