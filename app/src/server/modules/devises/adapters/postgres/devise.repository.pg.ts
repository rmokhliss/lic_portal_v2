// ==============================================================================
// LIC v2 — Adapter Postgres DeviseRepository (Phase 2.B étape 3/7)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Devise, PersistedDevise } from "../../domain/devise.entity";
import {
  type DbTransaction,
  DeviseRepository,
  type FindAllDevisesOptions,
} from "../../ports/devise.repository";

import { toEntity, toPersistence } from "./devise.mapper";
import { devisesRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class DeviseRepositoryPg extends DeviseRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllDevisesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedDevise[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const baseQuery = target.select().from(devisesRef);
    const filtered =
      opts?.actif === undefined ? baseQuery : baseQuery.where(eq(devisesRef.actif, opts.actif));

    const rows = await filtered.orderBy(asc(devisesRef.codeDevise));
    return rows.map(toEntity);
  }

  async findByCode(codeDevise: string, tx?: DbTransaction): Promise<PersistedDevise | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(devisesRef)
      .where(eq(devisesRef.codeDevise, codeDevise))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(devise: Devise, tx?: DbTransaction): Promise<PersistedDevise> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(devisesRef).values(toPersistence(devise)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_devises_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(devise: PersistedDevise, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(devisesRef)
      .set({
        nom: devise.nom,
        symbole: devise.symbole ?? null,
        actif: devise.actif,
      })
      .where(eq(devisesRef.id, devise.id));
  }
}
