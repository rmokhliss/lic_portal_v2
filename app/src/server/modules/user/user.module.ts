// ==============================================================================
// LIC v2 — Composition root du module user (intra-module DI uniquement)
//
// Exporte :
//   - userRepository : singleton repo (cross-module via composition-root.ts)
//   - listUsersUseCase : read-only EC-08 (pas d'audit, pas de cross-module)
//
// Les 4 use-cases mutateurs EC-08 (create/update/toggle/reset) DÉPENDENT du
// module audit (AuditRepository injecté) → câblés dans composition-root.ts,
// PAS ici (cf. app/CLAUDE.md « Composition root » ligne 146 — règle stricte
// pattern F-08 option (b)).
// ==============================================================================

import { UserRepositoryPg } from "./adapters/postgres/user.repository.pg";
import { ListUsersUseCase } from "./application/list-users.usecase";
import type { UserRepository } from "./ports/user.repository";

export const userRepository: UserRepository = new UserRepositoryPg();

export const listUsersUseCase = new ListUsersUseCase(userRepository);
