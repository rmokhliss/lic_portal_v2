// ==============================================================================
// LIC v2 — Adapter Postgres ProduitRepository (Phase 6 étape 6.B)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedProduit, Produit } from "../../domain/produit.entity";
import {
  type DbTransaction,
  type FindAllProduitsOptions,
  ProduitRepository,
} from "../../ports/produit.repository";

import { toEntity, toPersistence } from "./produit.mapper";
import { produitsRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class ProduitRepositoryPg extends ProduitRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllProduitsOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedProduit[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const baseQuery = target.select().from(produitsRef);
    const filtered =
      opts?.actif === undefined ? baseQuery : baseQuery.where(eq(produitsRef.actif, opts.actif));
    const rows = await filtered.orderBy(asc(produitsRef.code));
    return rows.map(toEntity);
  }

  async findById(id: number, tx?: DbTransaction): Promise<PersistedProduit | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(produitsRef).where(eq(produitsRef.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCode(code: string, tx?: DbTransaction): Promise<PersistedProduit | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(produitsRef).where(eq(produitsRef.code, code)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(produit: Produit, tx?: DbTransaction): Promise<PersistedProduit> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target.insert(produitsRef).values(toPersistence(produit)).returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_produits_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(produit: PersistedProduit, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(produitsRef)
      .set({
        nom: produit.nom,
        description: produit.description ?? null,
        actif: produit.actif,
      })
      .where(eq(produitsRef.id, produit.id));
  }
}
