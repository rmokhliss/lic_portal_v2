// ==============================================================================
// LIC v2 — Adapter Postgres EntiteRepository (Phase 4 étape 4.C)
// ==============================================================================

import { and, asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Entite, PersistedEntite } from "../../domain/entite.entity";
import { type DbTransaction, EntiteRepository } from "../../ports/entite.repository";

import { rowToEntity } from "./entite.mapper";
import { entites } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class EntiteRepositoryPg extends EntiteRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedEntite | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(entites).where(eq(entites.id, id)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByClient(clientId: string, tx?: DbTransaction): Promise<readonly PersistedEntite[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(entites)
      .where(eq(entites.clientId, clientId))
      .orderBy(asc(entites.nom));
    return rows.map(rowToEntity);
  }

  async findByClientAndNom(
    clientId: string,
    nom: string,
    tx?: DbTransaction,
  ): Promise<PersistedEntite | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(entites)
      .where(and(eq(entites.clientId, clientId), eq(entites.nom, nom)))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async save(entite: Entite, actorId: string, tx?: DbTransaction): Promise<PersistedEntite> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const inserted = await target
      .insert(entites)
      .values({
        clientId: entite.clientId,
        nom: entite.nom,
        codePays: entite.codePays,
        actif: entite.actif,
        creePar: actorId,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_entites n'a retourné aucune ligne",
      });
    }
    return rowToEntity(row);
  }

  async update(entite: PersistedEntite, actorId: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(entites)
      .set({
        nom: entite.nom,
        codePays: entite.codePays,
        actif: entite.actif,
        modifiePar: actorId,
      })
      .where(eq(entites.id, entite.id));
  }

  async updateActif(
    id: string,
    actif: boolean,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.update(entites).set({ actif, modifiePar: actorId }).where(eq(entites.id, id));
  }
}
