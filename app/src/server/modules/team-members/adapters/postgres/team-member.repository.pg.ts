// ==============================================================================
// LIC v2 — Adapter Postgres TeamMemberRepository (Phase 2.B étape 4/7)
// ==============================================================================

import { and, asc, eq, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedTeamMember, TeamMember } from "../../domain/team-member.entity";
import {
  type DbTransaction,
  type FindAllTeamMembersOptions,
  TeamMemberRepository,
} from "../../ports/team-member.repository";

import { toEntity, toPersistence } from "./team-member.mapper";
import { teamMembers } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class TeamMemberRepositoryPg extends TeamMemberRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllTeamMembersOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedTeamMember[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const conditions: SQL[] = [];
    if (opts?.actif !== undefined) conditions.push(eq(teamMembers.actif, opts.actif));
    if (opts?.roleTeam !== undefined) conditions.push(eq(teamMembers.roleTeam, opts.roleTeam));
    if (opts?.regionCode !== undefined) {
      conditions.push(eq(teamMembers.regionCode, opts.regionCode));
    }

    const baseQuery = target.select().from(teamMembers);
    const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    // Ordre stable : (nom ASC, prenom ASC, id ASC) — alignement règle L9
    // (affichage humain "Prénom NOM"). À l'écran, le tri secondaire `prenom`
    // garantit un ordre déterministe sur les homonymes.
    const rows = await filtered.orderBy(asc(teamMembers.nom), asc(teamMembers.id));
    return rows.map(toEntity);
  }

  async findById(id: number, tx?: DbTransaction): Promise<PersistedTeamMember | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(member: TeamMember, tx?: DbTransaction): Promise<PersistedTeamMember> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(teamMembers).values(toPersistence(member)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_team_members n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(member: PersistedTeamMember, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(teamMembers)
      .set({
        nom: member.nom,
        prenom: member.prenom ?? null,
        email: member.email ?? null,
        telephone: member.telephone ?? null,
        roleTeam: member.roleTeam,
        regionCode: member.regionCode ?? null,
        actif: member.actif,
      })
      .where(eq(teamMembers.id, member.id));
  }
}
