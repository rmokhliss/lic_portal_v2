// ==============================================================================
// LIC v2 — lic_team_members (Phase 2.B étape 1/7)
//
// Référentiel paramétrable SADMIN. Équipes commerciales S2M : Sales / Account
// Managers / Directeurs Métier. Préparation du remplacement des champs libres
// `sales_responsable` / `account_manager` de lic_clients (lot ultérieur).
//
// CHECK role_team IN ('SALES','AM','DM') : contrainte BD (data-model.md §
// référentiels). Pas de pgEnum pour rester aligné avec la spec stricte de
// data-model et permettre une évolution éditoriale par les SADMIN si besoin
// (l'écran /settings éditera la liste autorisée par mise à jour de la
// contrainte CHECK — pas par ALTER TYPE qui est plus invasif).
//
// FK region_code → lic_regions_ref(region_code) : renseigné pour les DM
// uniquement (cf. data-model.md). Nullable pour les SALES/AM.
// ==============================================================================

import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { regionsRef } from "@/server/modules/regions/adapters/postgres/schema";

export const teamMembers = pgTable(
  "lic_team_members",
  {
    id: serial("id").primaryKey(),
    nom: varchar("nom", { length: 100 }).notNull(),
    prenom: varchar("prenom", { length: 100 }),
    email: varchar("email", { length: 200 }),
    telephone: varchar("telephone", { length: 20 }),
    roleTeam: varchar("role_team", { length: 20 }).notNull(),
    regionCode: varchar("region_code", { length: 50 }).references(() => regionsRef.regionCode),
    actif: boolean("actif").notNull().default(true),
    dateCreation: timestamp("date_creation", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("ck_team_members_role", sql`${table.roleTeam} IN ('SALES','AM','DM')`),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_team_members_region_code").on(table.regionCode),
    index("idx_team_members_role").on(table.roleTeam),
    index("idx_team_members_actif").on(table.actif),
  ],
);
