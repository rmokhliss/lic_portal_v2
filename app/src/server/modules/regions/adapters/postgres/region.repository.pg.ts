// ==============================================================================
// LIC v2 — Adapter Postgres RegionRepository (Phase 2.B étape 2/7)
//
// Implémentation Drizzle des 4 méthodes du port. DI optionnelle de `db` en
// constructor (default = singleton). Permet aux tests d'intégration BD
// d'injecter une connexion dédiée pour BEGIN/ROLLBACK (cf. test-helpers).
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedRegion, Region } from "../../domain/region.entity";
import {
  type DbTransaction,
  type FindAllRegionsOptions,
  RegionRepository,
} from "../../ports/region.repository";

import { toEntity, toPersistence } from "./region.mapper";
import { regionsRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class RegionRepositoryPg extends RegionRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllRegionsOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedRegion[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const baseQuery = target.select().from(regionsRef);
    const filtered =
      opts?.actif === undefined ? baseQuery : baseQuery.where(eq(regionsRef.actif, opts.actif));

    const rows = await filtered.orderBy(asc(regionsRef.regionCode));
    return rows.map(toEntity);
  }

  async findByCode(regionCode: string, tx?: DbTransaction): Promise<PersistedRegion | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(regionsRef)
      .where(eq(regionsRef.regionCode, regionCode))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(region: Region, tx?: DbTransaction): Promise<PersistedRegion> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(regionsRef).values(toPersistence(region)).returning();
    if (row === undefined) {
      // Cas anormal : INSERT sans RETURNING n'est pas censé arriver.
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_regions_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(region: PersistedRegion, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(regionsRef)
      .set({
        nom: region.nom,
        dmResponsable: region.dmResponsable ?? null,
        actif: region.actif,
        // regionCode et id immuables, dateCreation BD-gérée → exclus du SET.
      })
      .where(eq(regionsRef.id, region.id));
  }
}
