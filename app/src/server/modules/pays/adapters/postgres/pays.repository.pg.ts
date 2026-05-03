// ==============================================================================
// LIC v2 — Adapter Postgres PaysRepository (Phase 2.B étape 3/7)
// ==============================================================================

import { and, asc, eq, type SQL } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedPays, Pays } from "../../domain/pays.entity";
import {
  type DbTransaction,
  type FindAllPaysOptions,
  PaysRepository,
} from "../../ports/pays.repository";

import { toEntity, toPersistence } from "./pays.mapper";
import { paysRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class PaysRepositoryPg extends PaysRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(opts?: FindAllPaysOptions, tx?: DbTransaction): Promise<readonly PersistedPays[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const conditions: SQL[] = [];
    if (opts?.actif !== undefined) conditions.push(eq(paysRef.actif, opts.actif));
    if (opts?.regionCode !== undefined) conditions.push(eq(paysRef.regionCode, opts.regionCode));

    const baseQuery = target.select().from(paysRef);
    const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    const rows = await filtered.orderBy(asc(paysRef.codePays));
    return rows.map(toEntity);
  }

  async findByCode(codePays: string, tx?: DbTransaction): Promise<PersistedPays | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(paysRef).where(eq(paysRef.codePays, codePays)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(pays: Pays, tx?: DbTransaction): Promise<PersistedPays> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(paysRef).values(toPersistence(pays)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_pays_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(pays: PersistedPays, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(paysRef)
      .set({
        nom: pays.nom,
        regionCode: pays.regionCode ?? null,
        actif: pays.actif,
      })
      .where(eq(paysRef.id, pays.id));
  }
}
