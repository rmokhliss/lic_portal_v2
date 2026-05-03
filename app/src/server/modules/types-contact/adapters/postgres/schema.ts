// ==============================================================================
// LIC v2 — lic_types_contact_ref (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Types de contacts client (ACHAT,
// FACTURATION, TECHNIQUE, …). Référencé par lic_contacts_clients.type_contact_code
// (FK posée Phase 4 EC-Clients quand la table parent existera).
// ==============================================================================

import { boolean, index, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const typesContactRef = pgTable(
  "lic_types_contact_ref",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull().unique("uq_types_contact_ref_code"),
    libelle: varchar("libelle", { length: 100 }).notNull(),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [index("idx_types_contact_ref_actif").on(table.actif)],
);
