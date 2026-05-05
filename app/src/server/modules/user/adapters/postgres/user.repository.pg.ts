// ==============================================================================
// LIC v2 — Adapter Postgres UserRepository (F-07 + extension EC-08)
//
// Implémente les 2 surfaces du port :
//   - Legacy F-07 : findById (UserRecord), updatePassword (must_change=false)
//   - EC-08      : findByIdEntity, findAll, findByMatricule, findByEmail,
//                  save, updateProfile, updateActif, resetPassword
//
// DI optionnelle de `db` en constructor (default = singleton). Permet aux
// tests d'intégration BD d'injecter une connexion dédiée pour BEGIN/ROLLBACK
// (cf. test-helpers.ts).
//
// Note R-28 : les use-cases EC-08 ouvrent `db.transaction()` interne (audit
// requis dans même tx — règle L3). Tests bascule sur pattern TRUNCATE+reseed.
// ==============================================================================

import { asc, eq, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedUser, User } from "../../domain/user.entity";
import {
  type DbTransaction,
  type FindAllUsersOptions,
  UserRepository,
  type UserRecord,
} from "../../ports/user.repository";

import { rowToEntity, rowToRecord } from "./user.mapper";
import { users } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class UserRepositoryPg extends UserRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  // --- Legacy F-07 (change-password) --------------------------------------

  async findById(id: string, tx?: DbTransaction): Promise<UserRecord | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(users).where(eq(users.id, id)).limit(1);
    const row = rows[0];
    return row ? rowToRecord(row) : null;
  }

  async updatePassword(id: string, newHash: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, id));
  }

  // --- EC-08 (nouveaux use-cases) -----------------------------------------

  async findByIdEntity(id: string, tx?: DbTransaction): Promise<PersistedUser | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(users).where(eq(users.id, id)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findAll(opts?: FindAllUsersOptions, tx?: DbTransaction): Promise<readonly PersistedUser[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const baseQuery = target.select().from(users);
    const filtered =
      opts?.actif === undefined ? baseQuery : baseQuery.where(eq(users.actif, opts.actif));
    const rows = await filtered.orderBy(asc(users.matricule));
    return rows.map(rowToEntity);
  }

  async findByMatricule(matricule: string, tx?: DbTransaction): Promise<PersistedUser | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(users).where(eq(users.matricule, matricule)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByEmail(email: string, tx?: DbTransaction): Promise<PersistedUser | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(users).where(eq(users.email, email)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async save(user: User, passwordHash: string, tx?: DbTransaction): Promise<PersistedUser> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const inserted = await target
      .insert(users)
      .values({
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        passwordHash,
        // Création admin = user doit changer son mot de passe à la 1re connexion.
        mustChangePassword: true,
        role: user.role,
        actif: true,
        telephone: user.telephone,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_users n'a retourné aucune ligne",
      });
    }
    return rowToEntity(row);
  }

  async updateProfile(user: PersistedUser, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(users)
      .set({
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      })
      .where(eq(users.id, user.id));
  }

  async updateActif(id: string, actif: boolean, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.update(users).set({ actif }).where(eq(users.id, id));
  }

  async resetPassword(id: string, newHash: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(users)
      .set({
        passwordHash: newHash,
        // Reset par admin = user doit le changer immédiatement.
        mustChangePassword: true,
        // Bump token_version → invalide les sessions JWT actives (règle sécu).
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, id));
  }

  // --- Phase 15 — brute-force lockout (audit Master C1) ---------------------

  async findLoginCounters(
    id: string,
    tx?: DbTransaction,
  ): Promise<{ failedLoginCount: number; lastFailedLoginAt: Date | null } | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select({
        failedLoginCount: users.failedLoginCount,
        lastFailedLoginAt: users.lastFailedLoginAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return null;
    return {
      failedLoginCount: row.failedLoginCount,
      lastFailedLoginAt: row.lastFailedLoginAt,
    };
  }

  async recordLoginFailure(
    id: string,
    newCount: number,
    failedAt: Date,
    tx?: DbTransaction,
  ): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(users)
      .set({ failedLoginCount: newCount, lastFailedLoginAt: failedAt })
      .where(eq(users.id, id));
  }

  async resetLoginCounters(id: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(users)
      .set({ failedLoginCount: 0, lastFailedLoginAt: null })
      .where(eq(users.id, id));
  }
}
