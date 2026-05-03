// ==============================================================================
// LIC v2 — Adapter Postgres ClientRepository (Phase 4 étape 4.B)
//
// Implémentation Drizzle des 5 méthodes du port. DI optionnelle de `db` en
// constructor (default = singleton). Permet aux tests d'intégration BD
// d'injecter une connexion dédiée.
//
// Spécificités EC-Clients :
//   - saveWithSiegeEntite : 2 INSERT atomiques (clients + entites) — la
//     « Siège » est créée par construction (1 client ⇒ 1 entité minimale).
//     L'adapter accède aux DEUX schémas (boundaries autorise adapters →
//     module-schema, eslint.config.mjs:147-155).
//   - update : optimistic locking via WHERE version = expected, throw
//     SPX-LIC-728 si 0 row affectée (RowCount returning).
//   - findPaginated : ORDER BY id DESC (uuidv7 = ordre chronologique inverse)
//     + LIMIT+1 pour détection page suivante (pattern audit).
//     FTS via search_vector @@ plainto_tsquery('french', q).
// ==============================================================================

import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";
import { entites } from "@/server/modules/entite/adapters/postgres/schema";

import type { Client, PersistedClient } from "../../domain/client.entity";
import { clientVersionConflict } from "../../domain/client.errors";
import {
  ClientRepository,
  type DbTransaction,
  type FindClientsPaginatedInput,
  type FindClientsPaginatedOutput,
  type SaveWithSiegeEntiteOutput,
  type SiegeEntiteInput,
} from "../../ports/client.repository";

import { rowToEntity } from "./client.mapper";
import { clients } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class ClientRepositoryPg extends ClientRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedClient | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(clients).where(eq(clients.id, id)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByCode(codeClient: string, tx?: DbTransaction): Promise<PersistedClient | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(clients)
      .where(eq(clients.codeClient, codeClient))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findPaginated(
    input: FindClientsPaginatedInput,
    tx?: DbTransaction,
  ): Promise<FindClientsPaginatedOutput> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conditions = [];
    if (input.actif !== undefined) {
      conditions.push(eq(clients.actif, input.actif));
    }
    if (input.statutClient !== undefined) {
      const s = input.statutClient;
      if (typeof s === "string") {
        conditions.push(eq(clients.statutClient, s));
      } else {
        conditions.push(inArray(clients.statutClient, [...s]));
      }
    }
    if (input.q !== undefined && input.q.trim().length > 0) {
      // FTS via search_vector GENERATED (cf. migration 0004 manuelle).
      // plainto_tsquery convertit la query texte libre en lexèmes français
      // (gestion des accents + stop words natifs).
      conditions.push(sql`${clients.searchVector} @@ plainto_tsquery('french', ${input.q.trim()})`);
    }
    if (input.cursor !== undefined) {
      const { id } = decodeCursor(input.cursor);
      conditions.push(lt(clients.id, id));
    }

    const rows = await target
      .select()
      .from(clients)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(clients.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map(rowToEntity);

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1];
      if (last !== undefined) {
        nextCursor = encodeCursor(last.createdAt, last.id);
      }
    }

    return { items, nextCursor, effectiveLimit: limit };
  }

  async saveWithSiegeEntite(
    client: Client,
    siege: SiegeEntiteInput,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<SaveWithSiegeEntiteOutput> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    // INSERT lic_clients
    const insertedClients = await target
      .insert(clients)
      .values({
        codeClient: client.codeClient,
        raisonSociale: client.raisonSociale,
        nomContact: client.nomContact,
        emailContact: client.emailContact,
        telContact: client.telContact,
        codePays: client.codePays,
        codeDevise: client.codeDevise,
        codeLangue: client.codeLangue,
        salesResponsable: client.salesResponsable,
        accountManager: client.accountManager,
        statutClient: client.statutClient,
        dateSignatureContrat: client.dateSignatureContrat,
        dateMiseEnProd: client.dateMiseEnProd,
        dateDemarrageSupport: client.dateDemarrageSupport,
        prochaineDateRenouvellementSupport: client.prochaineDateRenouvellementSupport,
        actif: client.actif,
        creePar: actorId,
        // version DEFAULT 0 — laissé à la BD
      })
      .returning();
    const clientRow = insertedClients[0];
    if (!clientRow) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_clients n'a retourné aucune ligne",
      });
    }
    const persistedClient = rowToEntity(clientRow);

    // INSERT lic_entites (Siège) — même tx, FK lic_clients.id valide à ce stade.
    const insertedEntites = await target
      .insert(entites)
      .values({
        clientId: persistedClient.id,
        nom: siege.nom,
        codePays: siege.codePays ?? client.codePays,
        actif: true,
        creePar: actorId,
      })
      .returning({ id: entites.id });
    const siegeRow = insertedEntites[0];
    if (!siegeRow) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_entites (Siège) n'a retourné aucune ligne",
      });
    }

    return { client: persistedClient, siegeEntiteId: siegeRow.id };
  }

  async update(
    client: PersistedClient,
    expectedVersion: number,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedClient> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    // UPDATE atomique avec contrainte version=expected. RETURNING pour
    // confirmer succès et récupérer la nouvelle version.
    const updated = await target
      .update(clients)
      .set({
        raisonSociale: client.raisonSociale,
        nomContact: client.nomContact,
        emailContact: client.emailContact,
        telContact: client.telContact,
        codePays: client.codePays,
        codeDevise: client.codeDevise,
        codeLangue: client.codeLangue,
        salesResponsable: client.salesResponsable,
        accountManager: client.accountManager,
        statutClient: client.statutClient,
        dateSignatureContrat: client.dateSignatureContrat,
        dateMiseEnProd: client.dateMiseEnProd,
        dateDemarrageSupport: client.dateDemarrageSupport,
        prochaineDateRenouvellementSupport: client.prochaineDateRenouvellementSupport,
        actif: client.actif,
        version: sql`${clients.version} + 1`,
        modifiePar: actorId,
      })
      .where(and(eq(clients.id, client.id), eq(clients.version, expectedVersion)))
      .returning();

    if (updated.length === 0) {
      // Soit le client n'existe pas (le caller use-case a déjà vérifié), soit
      // version mismatch (modification concurrente). On relit pour distinguer.
      const reread = await target
        .select({ version: clients.version })
        .from(clients)
        .where(eq(clients.id, client.id))
        .limit(1);
      const actualVersion = reread[0]?.version;
      if (actualVersion === undefined) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Client ${client.id} disparu pendant l'update`,
        });
      }
      throw clientVersionConflict(expectedVersion, actualVersion);
    }
    const updatedRow = updated[0];
    if (!updatedRow) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "UPDATE lic_clients RETURNING vide alors que rowCount > 0",
      });
    }
    return rowToEntity(updatedRow);
  }
}
