// ==============================================================================
// LIC v2 — Port TeamMemberRepository (Phase 2.B étape 4/7)
//
// Spécificité majeure vs les 5 référentiels précédents : pas de findByCode.
// Pas de code business stable → handle = id serial. Le port expose findById
// (number, pas string).
//
// FindAllTeamMembersOptions : 3 filtres (actif, roleTeam, regionCode) — usage
// probable EC-Clients Phase 4 (lister les Sales d'une région, etc.).
// ==============================================================================

import type { PersistedTeamMember, RoleTeam, TeamMember } from "../domain/team-member.entity";

export type DbTransaction = unknown;

export interface FindAllTeamMembersOptions {
  readonly actif?: boolean;
  readonly roleTeam?: RoleTeam;
  readonly regionCode?: string;
}

export abstract class TeamMemberRepository {
  abstract findAll(
    opts?: FindAllTeamMembersOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedTeamMember[]>;

  abstract findById(id: number, tx?: DbTransaction): Promise<PersistedTeamMember | null>;
  abstract save(member: TeamMember, tx?: DbTransaction): Promise<PersistedTeamMember>;
  abstract update(member: PersistedTeamMember, tx?: DbTransaction): Promise<void>;
}
