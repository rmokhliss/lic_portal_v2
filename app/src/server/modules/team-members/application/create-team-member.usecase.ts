// ==============================================================================
// LIC v2 — CreateTeamMemberUseCase (Phase 2.B étape 4/7)
//
// Pas de duplicate-check : data-model.md ne pose aucune UNIQUE constraint
// hors PK serial. La FK regionCode → lic_regions_ref.region_code est vérifiée
// par BD (PG 23503 propagé tel quel si la région n'existe pas).
// ==============================================================================

import { toDTO, type TeamMemberDTO } from "../adapters/postgres/team-member.mapper";
import {
  TeamMember,
  type CreateTeamMemberInput as DomainCreateInput,
} from "../domain/team-member.entity";
import type { TeamMemberRepository } from "../ports/team-member.repository";

export type CreateTeamMemberUseCaseInput = DomainCreateInput;

export class CreateTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: TeamMemberRepository) {}

  async execute(input: CreateTeamMemberUseCaseInput): Promise<TeamMemberDTO> {
    const member = TeamMember.create(input);
    const persisted = await this.teamMemberRepository.save(member);
    return toDTO(persisted);
  }
}
