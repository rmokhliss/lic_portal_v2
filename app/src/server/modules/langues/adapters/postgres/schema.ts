// ==============================================================================
// LIC v2 — lic_langues_ref (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Langues supportées par le portail
// (codes ISO courts : fr, en, ar, …). Préférence utilisateur stockée par code
// dans lic_users (lot ultérieur).
// ==============================================================================

import { boolean, index, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const languesRef = pgTable(
  "lic_langues_ref",
  {
    id: serial("id").primaryKey(),
    codeLangue: varchar("code_langue", { length: 5 })
      .notNull()
      .unique("uq_langues_ref_code_langue"),
    nom: varchar("nom", { length: 100 }).notNull(),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [index("idx_langues_ref_actif").on(table.actif)],
);
