// ==============================================================================
// LIC v2 — lic_articles_ref (Phase 6 étape 6.A)
//
// Articles d'un produit SELECT-PX. PK serial (ADR 0017). Identifiant business
// stable = (produit_id, code) — code unique par produit (CORE-USERS,
// CORE-TX, REPORTING-EXPORTS…).
//
// FK lic_produits_ref(id) — pas de cascade : on désactive d'abord le produit
// (actif=false) qui rend ses articles invisibles aux nouveaux contrats.
//
// `unite_volume` : "transactions" / "utilisateurs" / "exports" / "Mo"…
// libre côté SADMIN, affiché brut dans l'UI volumes Phase 6.F.
// ==============================================================================

import { boolean, index, integer, pgTable, serial, unique, varchar } from "drizzle-orm/pg-core";

import { produitsRef } from "@/server/modules/produit/adapters/postgres/schema";

export const articlesRef = pgTable(
  "lic_articles_ref",
  {
    id: serial("id").primaryKey(),
    produitId: integer("produit_id")
      .notNull()
      .references(() => produitsRef.id),
    code: varchar("code", { length: 30 }).notNull(),
    nom: varchar("nom", { length: 200 }).notNull(),
    description: varchar("description", { length: 1000 }),
    uniteVolume: varchar("unite_volume", { length: 30 }).notNull().default("transactions"),
    actif: boolean("actif").notNull().default(true),
  },
  (table) => [
    unique("uq_articles_ref_produit_code").on(table.produitId, table.code),
    index("idx_articles_ref_produit").on(table.produitId),
    index("idx_articles_ref_actif").on(table.actif),
  ],
);
