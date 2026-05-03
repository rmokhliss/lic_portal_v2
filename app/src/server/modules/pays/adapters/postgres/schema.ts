// ==============================================================================
// LIC v2 — lic_pays_ref (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Pays clients indexés par code ISO 3166-1
// alpha-2 (varchar(2)). Rattaché à une région commerciale via region_code
// (FK code logique, pas FK uuid — cf. ADR 0017).
//
// FK posée vers lic_regions_ref.region_code (et non lic_regions_ref.id) :
// l'identifiant métier stable est le code, l'id serial est purement interne.
// ==============================================================================

import { boolean, index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { regionsRef } from "@/server/modules/regions/adapters/postgres/schema";

export const paysRef = pgTable(
  "lic_pays_ref",
  {
    id: serial("id").primaryKey(),
    codePays: varchar("code_pays", { length: 2 }).notNull().unique("uq_pays_ref_code_pays"),
    nom: varchar("nom", { length: 100 }).notNull(),
    regionCode: varchar("region_code", { length: 50 }).references(() => regionsRef.regionCode),
    actif: boolean("actif").notNull().default(true),
    dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_pays_ref_region_code").on(table.regionCode),
    index("idx_pays_ref_actif").on(table.actif),
  ],
);
