// ==============================================================================
// LIC v2 — UpdateTeamMemberUseCase (Phase 2.B étape 4/7)
//
// Patch partiel sur tous les champs sauf id, dateCreation, actif (toggle séparé).
// Convention sur les optionnels :
//   - undefined : inchangé
//   - null      : effacer (pour prenom/email/telephone/regionCode)
//   - value     : remplacer
// `nom` (required) et `roleTeam` (required) ne supportent pas null.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

import { toDTO, type TeamMemberDTO } from "../adapters/postgres/team-member.mapper";
import type { RoleTeam } from "../domain/team-member.entity";
import { teamMemberNotFoundById } from "../domain/team-member.errors";
import type { TeamMemberRepository } from "../ports/team-member.repository";

export interface UpdateTeamMemberUseCaseInput {
  readonly id: number;
  readonly nom?: string;
  readonly prenom?: string | null;
  readonly email?: string | null;
  readonly telephone?: string | null;
  readonly roleTeam?: RoleTeam;
  readonly regionCode?: string | null;
}

export class UpdateTeamMemberUseCase {
  constructor(private readonly teamMemberRepository: TeamMemberRepository) {}

  async execute(input: UpdateTeamMemberUseCaseInput): Promise<TeamMemberDTO> {
    if (!Number.isInteger(input.id) || input.id <= 0) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `id invalide : "${String(input.id)}" (entier positif attendu)`,
      });
    }

    const existing = await this.teamMemberRepository.findById(input.id);
    if (existing === null) {
      throw teamMemberNotFoundById(input.id);
    }

    // Construit le patch en filtrant les `undefined` mais en préservant les
    // `null` explicites (différenciés par `in` dans withPatch). Type mutable
    // local — les readonly du type input du port sont seulement à l'API
    // boundary, ici on accumule.
    const patch: {
      nom?: string;
      prenom?: string | null;
      email?: string | null;
      telephone?: string | null;
      roleTeam?: RoleTeam;
      regionCode?: string | null;
    } = {};
    if (input.nom !== undefined) patch.nom = input.nom;
    if ("prenom" in input) patch.prenom = input.prenom;
    if ("email" in input) patch.email = input.email;
    if ("telephone" in input) patch.telephone = input.telephone;
    if (input.roleTeam !== undefined) patch.roleTeam = input.roleTeam;
    if ("regionCode" in input) patch.regionCode = input.regionCode;

    const updated = existing.withPatch(patch);
    await this.teamMemberRepository.update(updated);
    return toDTO(updated);
  }
}
