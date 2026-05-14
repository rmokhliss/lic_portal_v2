// ==============================================================================
// LIC v2 — lic_clients_ref (Phase 24)
//
// Référentiel des codes clients S2M (lecture seule depuis l'UI, alimenté par
// le seed bootstrap). Permet l'autocomplétion à la création client dans
// /clients/new : si le code saisi figure dans le référentiel, raison_sociale
// est pré-remplie. Si la saisie est libre, le comportement reste inchangé.
//
// PK = `code_client` lui-même (varchar 50) — identifiant business stable,
// pas de serial intermédiaire. Pattern référentiel simple, ADR 0017.
// ==============================================================================

import { boolean, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const clientsRef = pgTable("lic_clients_ref", {
  codeClient: varchar("code_client", { length: 50 }).primaryKey(),
  raisonSociale: varchar("raison_sociale", { length: 255 }).notNull(),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
