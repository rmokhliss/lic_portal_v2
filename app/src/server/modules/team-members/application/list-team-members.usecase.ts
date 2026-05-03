// ==============================================================================
// LIC v2 — ListTeamMembersUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { toDTO, type TeamMemberDTO } from "../adapters/postgres/team-member.mapper";
import type {
  FindAllTeamMembersOptions,
  TeamMemberRepository,
} from "../ports/team-member.repository";

export type ListTeamMembersInput = FindAllTeamMembersOptions;

export class ListTeamMembersUseCase {
  constructor(private readonly teamMemberRepository: TeamMemberRepository) {}

  async execute(input: ListTeamMembersInput = {}): Promise<readonly TeamMemberDTO[]> {
    const all = await this.teamMemberRepository.findAll(input);
    return all.map(toDTO);
  }
}
