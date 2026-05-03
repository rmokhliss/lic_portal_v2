// ==============================================================================
// LIC v2 — Adapter Postgres LangueRepository (Phase 2.B étape 3/7)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Langue, PersistedLangue } from "../../domain/langue.entity";
import {
  type DbTransaction,
  type FindAllLanguesOptions,
  LangueRepository,
} from "../../ports/langue.repository";

import { toEntity, toPersistence } from "./langue.mapper";
import { languesRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class LangueRepositoryPg extends LangueRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllLanguesOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLangue[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const baseQuery = target.select().from(languesRef);
    const filtered =
      opts?.actif === undefined ? baseQuery : baseQuery.where(eq(languesRef.actif, opts.actif));

    const rows = await filtered.orderBy(asc(languesRef.codeLangue));
    return rows.map(toEntity);
  }

  async findByCode(codeLangue: string, tx?: DbTransaction): Promise<PersistedLangue | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(languesRef)
      .where(eq(languesRef.codeLangue, codeLangue))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(langue: Langue, tx?: DbTransaction): Promise<PersistedLangue> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(languesRef).values(toPersistence(langue)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_langues_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(langue: PersistedLangue, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(languesRef)
      .set({
        nom: langue.nom,
        actif: langue.actif,
      })
      .where(eq(languesRef.id, langue.id));
  }
}
