// ==============================================================================
// LIC v2 — ListUsersUseCase (Phase 2.B.bis EC-08)
//
// Read-only, pas de mutation, pas d'audit, pas de transaction. Câblé dans
// user.module.ts directement (pas de dépendance audit cross-module — ce
// use-case n'écrit rien).
//
// Volume attendu < 100 lignes (back-office S2M, équipe restreinte) — pas de
// pagination cursor. Tri ASC sur matricule (lecture stable, MAT-001 d'abord).
// ==============================================================================

import { toDTO, type UserDTO } from "../adapters/postgres/user.mapper";
import type { FindAllUsersOptions, UserRepository } from "../ports/user.repository";

export interface ListUsersUseCaseInput {
  readonly actif?: boolean;
}

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ListUsersUseCaseInput = {}): Promise<readonly UserDTO[]> {
    const opts: FindAllUsersOptions = input.actif === undefined ? {} : { actif: input.actif };
    const users = await this.userRepository.findAll(opts);
    return users.map(toDTO);
  }
}
