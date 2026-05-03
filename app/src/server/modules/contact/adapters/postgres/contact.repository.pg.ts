// ==============================================================================
// LIC v2 — Adapter Postgres ContactRepository (Phase 4 étape 4.C)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Contact, PersistedContact } from "../../domain/contact.entity";
import { ContactRepository, type DbTransaction } from "../../ports/contact.repository";

import { rowToEntity } from "./contact.mapper";
import { contactsClients } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class ContactRepositoryPg extends ContactRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedContact | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(contactsClients)
      .where(eq(contactsClients.id, id))
      .limit(1);
    const row = rows[0];
    return row ? rowToEntity(row) : null;
  }

  async findByEntite(entiteId: string, tx?: DbTransaction): Promise<readonly PersistedContact[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(contactsClients)
      .where(eq(contactsClients.entiteId, entiteId))
      .orderBy(asc(contactsClients.typeContactCode), asc(contactsClients.nom));
    return rows.map(rowToEntity);
  }

  async save(contact: Contact, actorId: string, tx?: DbTransaction): Promise<PersistedContact> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const inserted = await target
      .insert(contactsClients)
      .values({
        entiteId: contact.entiteId,
        typeContactCode: contact.typeContactCode,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone,
        actif: contact.actif,
        creePar: actorId,
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_contacts_clients n'a retourné aucune ligne",
      });
    }
    return rowToEntity(row);
  }

  async update(contact: PersistedContact, actorId: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(contactsClients)
      .set({
        typeContactCode: contact.typeContactCode,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone,
        modifiePar: actorId,
      })
      .where(eq(contactsClients.id, contact.id));
  }

  async delete(id: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.delete(contactsClients).where(eq(contactsClients.id, id));
  }
}
