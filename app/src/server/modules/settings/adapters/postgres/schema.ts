// ==============================================================================
// LIC v2 — lic_settings (F-06)
//
// Table key-value pour les paramètres applicatifs : PKI (clé maîtresse, certif
// CA), SMTP, toggles, etc. Aucun seed à F-06 — chaque clé sera ajoutée par
// la phase qui en a besoin (PKI = Phase 3, SMTP = écran Settings, etc.).
//
// Pas de created_at : table updatée en place, key immutable.
// ==============================================================================

import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

import { referenceUuid } from "@/server/infrastructure/db/columns";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const settings = pgTable(
  "lic_settings",
  {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: jsonb("value").$type<unknown>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: referenceUuid("updated_by", () => users.id), // nullable
  },
  (table) => [
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_settings_updated_by").on(table.updatedBy),
  ],
);
