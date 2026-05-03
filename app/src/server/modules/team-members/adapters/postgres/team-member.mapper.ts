// ==============================================================================
// LIC v2 — Mapper TeamMember (Phase 2.B étape 4/7)
//
// Cast du roleTeam BD (varchar) → union typée. La contrainte CHECK garantit
// les 3 valeurs admises ; rehydrate ne re-valide pas (BD = source).
// ==============================================================================

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import {
  type PersistedTeamMember,
  type RoleTeam,
  TeamMember,
} from "../../domain/team-member.entity";

import type { teamMembers } from "./schema";

type TeamMemberRow = InferSelectModel<typeof teamMembers>;
type TeamMemberInsert = InferInsertModel<typeof teamMembers>;

export interface TeamMemberDTO {
  readonly id: number;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly roleTeam: RoleTeam;
  readonly regionCode: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export function toEntity(row: TeamMemberRow): PersistedTeamMember {
  return TeamMember.rehydrate({
    id: row.id,
    nom: row.nom,
    prenom: row.prenom ?? undefined,
    email: row.email ?? undefined,
    telephone: row.telephone ?? undefined,
    // CHECK BD garantit que roleTeam ∈ {SALES, AM, DM} — cast safe.
    roleTeam: row.roleTeam as RoleTeam,
    regionCode: row.regionCode ?? undefined,
    actif: row.actif,
    dateCreation: row.dateCreation,
  });
}

export function toDTO(entity: PersistedTeamMember): TeamMemberDTO {
  return {
    id: entity.id,
    nom: entity.nom,
    prenom: entity.prenom ?? null,
    email: entity.email ?? null,
    telephone: entity.telephone ?? null,
    roleTeam: entity.roleTeam,
    regionCode: entity.regionCode ?? null,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
  };
}

export function toPersistence(entity: TeamMember): TeamMemberInsert {
  return {
    nom: entity.nom,
    prenom: entity.prenom ?? null,
    email: entity.email ?? null,
    telephone: entity.telephone ?? null,
    roleTeam: entity.roleTeam,
    regionCode: entity.regionCode ?? null,
    actif: entity.actif,
  };
}
