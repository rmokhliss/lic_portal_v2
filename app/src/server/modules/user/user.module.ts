// ==============================================================================
// LIC v2 — Composition root du module user (intra-module DI uniquement)
//
// Exporte le singleton userRepository destiné à être consommé EXCLUSIVEMENT par
// app/src/server/composition-root.ts. Les use-cases user sont câblés dans
// composition-root.ts (pas ici) car ils dépendent d'autres modules (audit).
// ==============================================================================

import { UserRepositoryPg } from "./adapters/postgres/user.repository.pg";
import type { UserRepository } from "./ports/user.repository";

export const userRepository: UserRepository = new UserRepositoryPg();
