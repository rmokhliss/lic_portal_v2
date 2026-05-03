// ==============================================================================
// LIC v2 — Composition root du module contact (Phase 4 étape 4.C)
// Use-cases mutateurs (create/update/delete) câblés dans composition-root.ts.
// ==============================================================================

import { ContactRepositoryPg } from "./adapters/postgres/contact.repository.pg";
import { GetContactUseCase } from "./application/get-contact.usecase";
import { ListContactsByEntiteUseCase } from "./application/list-contacts-by-entite.usecase";
import type { ContactRepository } from "./ports/contact.repository";

export const contactRepository: ContactRepository = new ContactRepositoryPg();

export const getContactUseCase = new GetContactUseCase(contactRepository);
export const listContactsByEntiteUseCase = new ListContactsByEntiteUseCase(contactRepository);
