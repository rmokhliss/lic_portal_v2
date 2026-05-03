// ==============================================================================
// LIC v2 — Composition root du module types-contact (Phase 2.B étape 3/7)
// ==============================================================================

import { TypeContactRepositoryPg } from "./adapters/postgres/type-contact.repository.pg";
import { CreateTypeContactUseCase } from "./application/create-type-contact.usecase";
import { GetTypeContactUseCase } from "./application/get-type-contact.usecase";
import { ListTypesContactUseCase } from "./application/list-types-contact.usecase";
import { ToggleTypeContactUseCase } from "./application/toggle-type-contact.usecase";
import { UpdateTypeContactUseCase } from "./application/update-type-contact.usecase";
import type { TypeContactRepository } from "./ports/type-contact.repository";

export const typeContactRepository: TypeContactRepository = new TypeContactRepositoryPg();

export const listTypesContactUseCase = new ListTypesContactUseCase(typeContactRepository);
export const getTypeContactUseCase = new GetTypeContactUseCase(typeContactRepository);
export const createTypeContactUseCase = new CreateTypeContactUseCase(typeContactRepository);
export const updateTypeContactUseCase = new UpdateTypeContactUseCase(typeContactRepository);
export const toggleTypeContactUseCase = new ToggleTypeContactUseCase(typeContactRepository);
