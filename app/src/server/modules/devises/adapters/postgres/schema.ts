// ==============================================================================
// LIC v2 — lic_devises_ref (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Devises de facturation (ISO 4217 ou variantes
// legacy : XOF, XAF). Symbole optionnel (DH, €, $, …).
// ==============================================================================

import { boolean, index, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const devisesRef = pgTable(
  "lic_devises_ref",
  {
    id: serial("id").primaryKey(),
    codeDevise: varchar("code_devise", { length: 10 })
      .notNull()
      .unique("uq_devises_ref_code_devise"),
    nom: varchar("nom", { length: 100 }).notNull(),
    symbole: varchar("symbole", { length: 10 }),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [index("idx_devises_ref_actif").on(table.actif)],
);
