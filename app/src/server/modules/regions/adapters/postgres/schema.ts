// ==============================================================================
// LIC v2 — lic_regions_ref (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Régions commerciales utilisées comme parent
// logique de lic_pays_ref et de lic_team_members (DM rattaché à une région).
//
// PK serial : exception ADR 0017 vs ADR 0005 (uuidv7 partout). Justifications :
// codes business stables (region_code), jamais exposés en API publique, FK par
// code logique (lic_pays_ref.region_code → ce code), volume très faible.
// ==============================================================================

import { boolean, index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const regionsRef = pgTable(
  "lic_regions_ref",
  {
    id: serial("id").primaryKey(),
    regionCode: varchar("region_code", { length: 50 })
      .notNull()
      .unique("uq_regions_ref_region_code"),
    nom: varchar("nom", { length: 100 }).notNull(),
    dmResponsable: varchar("dm_responsable", { length: 100 }),
    actif: boolean("actif").notNull().default(true),
    dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_regions_ref_actif").on(table.actif)],
);
