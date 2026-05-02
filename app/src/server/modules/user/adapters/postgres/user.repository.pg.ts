// ==============================================================================
// LIC v2 — Adapter Postgres UserRepository (F-07, refactor F-08 DI db)
//
// Implémentation Drizzle des opérations exposées par UserRepository.
// F-08 : DI optionnelle de `db` en constructor (default = singleton). Permet
// aux tests d'intégration BD d'injecter une connexion dédiée pour le pattern
// BEGIN/ROLLBACK (cf. infrastructure/db/test-helpers.ts).
// ==============================================================================

import { eq, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";
import {
  type DbTransaction,
  UserRepository,
  type UserRecord,
} from "@/server/modules/user/ports/user.repository";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class UserRepositoryPg extends UserRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<UserRecord | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const rows = await target
      .select({
        id: users.id,
        email: users.email,
        matricule: users.matricule,
        nom: users.nom,
        prenom: users.prenom,
        passwordHash: users.passwordHash,
        mustChangePassword: users.mustChangePassword,
        tokenVersion: users.tokenVersion,
        role: users.role,
        actif: users.actif,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  async updatePassword(id: string, newHash: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    await target
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: false,
        // Bump atomique : SQL token_version = token_version + 1 (pas d'optimistic
        // locking nécessaire ici, l'incrément SQL est atomique).
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, id));
  }
}
