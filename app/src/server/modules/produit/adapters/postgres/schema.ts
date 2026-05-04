// ==============================================================================
// LIC v2 — lic_produits_ref (Phase 6 étape 6.A)
//
// Référentiel paramétrable SADMIN. PK serial (ADR 0017 — codes business
// stables, pas d'audit obligatoire R-27). Code court (SPX-CORE, SPX-API…)
// pour identifier le produit commercial SELECT-PX.
//
// Table parent de lic_articles_ref (1 produit → N articles).
// ==============================================================================

import { boolean, index, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const produitsRef = pgTable(
  "lic_produits_ref",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull().unique("uq_produits_ref_code"),
    nom: varchar("nom", { length: 200 }).notNull(),
    description: varchar("description", { length: 1000 }),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [index("idx_produits_ref_actif").on(table.actif)],
);
