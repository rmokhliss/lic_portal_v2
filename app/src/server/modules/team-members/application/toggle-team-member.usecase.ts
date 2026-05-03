// ==============================================================================
// LIC v2 — ToggleTeamMemberUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

import { toDTO, type TeamMemberDTO } from "../adapters/postgres/team-member.mapper";
import { teamMemberNotFoundById } from "../domain/team-member.errors";
import type { TeamMemberRepository } from "../ports/team-member.repository";

export class ToggleTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: TeamMemberRepository) {}

  async execute(id: number): Promise<TeamMemberDTO> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `id invalide : "${String(id)}" (entier positif attendu)`,
      });
    }
    const existing = await this.teamMemberRepository.findById(id);
    if (existing === null) {
      throw teamMemberNotFoundById(id);
    }
    const toggled = existing.toggle();
    await this.teamMemberRepository.update(toggled);
    return toDTO(toggled);
  }
}
