// ==============================================================================
// LIC v2 — Composition root du module langues (Phase 2.B étape 3/7)
// ==============================================================================

import { LangueRepositoryPg } from "./adapters/postgres/langue.repository.pg";
import { CreateLangueUseCase } from "./application/create-langue.usecase";
import { GetLangueUseCase } from "./application/get-langue.usecase";
import { ListLanguesUseCase } from "./application/list-langues.usecase";
import { ToggleLangueUseCase } from "./application/toggle-langue.usecase";
import { UpdateLangueUseCase } from "./application/update-langue.usecase";
import type { LangueRepository } from "./ports/langue.repository";

export const langueRepository: LangueRepository = new LangueRepositoryPg();

export const listLanguesUseCase = new ListLanguesUseCase(langueRepository);
export const getLangueUseCase = new GetLangueUseCase(langueRepository);
export const createLangueUseCase = new CreateLangueUseCase(langueRepository);
export const updateLangueUseCase = new UpdateLangueUseCase(langueRepository);
export const toggleLangueUseCase = new ToggleLangueUseCase(langueRepository);
