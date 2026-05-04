// ==============================================================================
// LIC v2 — Adapter Postgres LicenceProduitRepository (Phase 6 étape 6.C)
// ==============================================================================

import { and, asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { LicenceProduit, PersistedLicenceProduit } from "../../domain/licence-produit.entity";
import {
  type DbTransaction,
  LicenceProduitRepository,
} from "../../ports/licence-produit.repository";

import { toEntity } from "./licence-produit.mapper";
import { licenceProduits } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class LicenceProduitRepositoryPg extends LicenceProduitRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedLicenceProduit | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceProduits)
      .where(eq(licenceProduits.id, id))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByLicenceProduit(
    licenceId: string,
    produitId: number,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceProduit | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceProduits)
      .where(
        and(eq(licenceProduits.licenceId, licenceId), eq(licenceProduits.produitId, produitId)),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByLicence(
    licenceId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedLicenceProduit[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licenceProduits)
      .where(eq(licenceProduits.licenceId, licenceId))
      .orderBy(asc(licenceProduits.dateAjout));
    return rows.map(toEntity);
  }

  async save(
    entity: LicenceProduit,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicenceProduit> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(licenceProduits)
      .values({
        licenceId: entity.licenceId,
        produitId: entity.produitId,
        creePar: actorId,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_licence_produits n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async delete(id: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.delete(licenceProduits).where(eq(licenceProduits.id, id));
  }
}
