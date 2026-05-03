// ==============================================================================
// LIC v2 — GetTeamMemberUseCase (Phase 2.B étape 4/7)
//
// Lookup par id (PK serial). Validation d'entrée : nombre entier positif.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

import { toDTO, type TeamMemberDTO } from "../adapters/postgres/team-member.mapper";
import { teamMemberNotFoundById } from "../domain/team-member.errors";
import type { TeamMemberRepository } from "../ports/team-member.repository";

export class GetTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: TeamMemberRepository) {}

  async execute(id: number): Promise<TeamMemberDTO> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `id invalide : "${String(id)}" (entier positif attendu)`,
      });
    }
    const member = await this.teamMemberRepository.findById(id);
    if (member === null) {
      throw teamMemberNotFoundById(id);
    }
    return toDTO(member);
  }
}
