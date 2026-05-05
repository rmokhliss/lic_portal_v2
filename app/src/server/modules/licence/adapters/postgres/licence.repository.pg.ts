// ==============================================================================
// LIC v2 — Adapter Postgres LicenceRepository (Phase 5)
//
// allocateNextReference :
//   SELECT max(...) FROM lic_licences WHERE reference LIKE 'LIC-{YYYY}-%';
//   parse 3+ derniers digits → +1 → format LIC-{YYYY}-{NNN} (NNN zéro-paddé 3).
// Pattern audit (cf. licence.repository.pg.ts:112-118 audit) — ORDER BY id
// DESC en cursor pagination (uuidv7 ordre chronologique).
// ==============================================================================

import { and, desc, eq, ilike, inArray, like, lt, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Licence, PersistedLicence } from "../../domain/licence.entity";
import { licenceVersionConflict } from "../../domain/licence.errors";
import {
  type DbTransaction,
  type FindLicencesPaginatedInput,
  type FindLicencesPaginatedOutput,
  LicenceRepository,
} from "../../ports/licence.repository";

import { rowToEntity } from "./licence.mapper";
import { licences } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class LicenceRepositoryPg extends LicenceRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedLicence | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(licences).where(eq(licences.id, id)).limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByReference(reference: string, tx?: DbTransaction): Promise<PersistedLicence | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(licences)
      .where(eq(licences.reference, reference))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findPaginated(
    input: FindLicencesPaginatedInput,
    tx?: DbTransaction,
  ): Promise<FindLicencesPaginatedOutput> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conditions = [];
    if (input.clientId !== undefined) {
      conditions.push(eq(licences.clientId, input.clientId));
    }
    if (input.entiteId !== undefined) {
      conditions.push(eq(licences.entiteId, input.entiteId));
    }
    if (input.status !== undefined) {
      const s = input.status;
      if (typeof s === "string") {
        conditions.push(eq(licences.status, s));
      } else {
        conditions.push(inArray(licences.status, [...s]));
      }
    }
    if (input.q !== undefined && input.q.trim().length > 0) {
      conditions.push(ilike(licences.reference, `%${input.q.trim()}%`));
    }
    if (input.cursor !== undefined) {
      const { id } = decodeCursor(input.cursor);
      conditions.push(lt(licences.id, id));
    }

    const rows = await target
      .select()
      .from(licences)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(licences.id))
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

  async allocateNextReference(tx?: DbTransaction): Promise<string> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const year = new Date().getFullYear();
    const prefix = `LIC-${String(year)}-`;

    const rows = await target
      .select({ reference: licences.reference })
      .from(licences)
      .where(like(licences.reference, `${prefix}%`))
      .orderBy(desc(licences.reference))
      .limit(1);

    let next = 1;
    const lastRef = rows[0]?.reference;
    if (lastRef !== undefined) {
      const match = /^LIC-\d{4}-(\d+)$/.exec(lastRef);
      if (match?.[1] !== undefined) {
        next = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(next).padStart(3, "0")}`;
  }

  async save(licence: Licence, actorId: string, tx?: DbTransaction): Promise<PersistedLicence> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const inserted = await target
      .insert(licences)
      .values({
        reference: licence.reference,
        clientId: licence.clientId,
        entiteId: licence.entiteId,
        dateDebut: licence.dateDebut,
        dateFin: licence.dateFin,
        status: licence.status,
        commentaire: licence.commentaire,
        renouvellementAuto: licence.renouvellementAuto,
        notifEnvoyee: licence.notifEnvoyee,
        creePar: actorId,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_licences n'a retourné aucune ligne",
      });
    }
    return rowToEntity(row);
  }

  async update(
    licence: PersistedLicence,
    expectedVersion: number,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedLicence> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const updated = await target
      .update(licences)
      .set({
        dateDebut: licence.dateDebut,
        dateFin: licence.dateFin,
        status: licence.status,
        commentaire: licence.commentaire,
        renouvellementAuto: licence.renouvellementAuto,
        notifEnvoyee: licence.notifEnvoyee,
        version: sql`${licences.version} + 1`,
        modifiePar: actorId,
      })
      .where(and(eq(licences.id, licence.id), eq(licences.version, expectedVersion)))
      .returning();

    if (updated.length === 0) {
      const reread = await target
        .select({ version: licences.version })
        .from(licences)
        .where(eq(licences.id, licence.id))
        .limit(1);
      const actualVersion = reread[0]?.version;
      if (actualVersion === undefined) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Licence ${licence.id} disparue pendant l'update`,
        });
      }
      throw licenceVersionConflict(expectedVersion, actualVersion);
    }
    const row = updated[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "UPDATE lic_licences RETURNING vide alors que rowCount > 0",
      });
    }
    return rowToEntity(row);
  }
}
