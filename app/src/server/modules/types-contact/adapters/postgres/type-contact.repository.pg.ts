// ==============================================================================
// LIC v2 — Adapter Postgres TypeContactRepository (Phase 2.B étape 3/7)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { PersistedTypeContact, TypeContact } from "../../domain/type-contact.entity";
import {
  type DbTransaction,
  type FindAllTypesContactOptions,
  TypeContactRepository,
} from "../../ports/type-contact.repository";

import { toEntity, toPersistence } from "./type-contact.mapper";
import { typesContactRef } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class TypeContactRepositoryPg extends TypeContactRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findAll(
    opts?: FindAllTypesContactOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedTypeContact[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;

    const baseQuery = target.select().from(typesContactRef);
    const filtered =
      opts?.actif === undefined
        ? baseQuery
        : baseQuery.where(eq(typesContactRef.actif, opts.actif));

    const rows = await filtered.orderBy(asc(typesContactRef.code));
    return rows.map(toEntity);
  }

  async findByCode(code: string, tx?: DbTransaction): Promise<PersistedTypeContact | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(typesContactRef)
      .where(eq(typesContactRef.code, code))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async save(typeContact: TypeContact, tx?: DbTransaction): Promise<PersistedTypeContact> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(typesContactRef)
      .values(toPersistence(typeContact))
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_types_contact_ref n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(typeContact: PersistedTypeContact, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(typesContactRef)
      .set({
        libelle: typeContact.libelle,
        actif: typeContact.actif,
      })
      .where(eq(typesContactRef.id, typeContact.id));
  }
}
