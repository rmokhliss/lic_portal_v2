// ==============================================================================
// LIC v2 — Helpers de colonnes Drizzle réutilisables (F-06)
//
// Centralise les patterns de colonnes répétés à travers les tables :
//   - PK uuidv7 (ADR 0005, PG 18 natif)
//   - FK uuid avec référence
//   - timestamps createdAt/updatedAt en TIMESTAMPTZ (Référentiel §4.17)
//   - createdAt seul pour les tables append-only (ex: lic_audit_log)
// ==============================================================================

import { sql } from "drizzle-orm";
import { type AnyPgColumn, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Colonne PK uuidv7. Génération PG natif via `uuidv7()` (PG 18, ADR 0005).
 * Nom de colonne fixé à "id" (convention LIC).
 *
 * Usage :
 *   pgTable("lic_xxx", { id: primaryUuid(), ... })
 */
export function primaryUuid() {
  return uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);
}

/**
 * Colonne FK uuid vers une autre table/colonne.
 *
 * Nullable par défaut (cohérent Drizzle). Chaîner `.notNull()` pour les FK
 * obligatoires (cas le plus fréquent dans LIC v2).
 *
 * Usage :
 *   userId: referenceUuid("user_id", () => users.id).notNull()
 *   creePar: referenceUuid("cree_par", () => users.id)  // nullable explicite
 */
export function referenceUuid(name: string, ref: () => AnyPgColumn) {
  return uuid(name).references(ref);
}

/**
 * Paire createdAt + updatedAt en TIMESTAMPTZ (Référentiel §4.17).
 *
 * `updatedAt` utilise `$onUpdate` côté Drizzle : la valeur est recalculée
 * automatiquement à chaque UPDATE émis via Drizzle. Ce n'est PAS un trigger
 * SQL — un UPDATE en SQL brut ne mettrait pas à jour la colonne. LIC interdit
 * le SQL brut (CLAUDE.md MUST NOT) donc cette limitation est sans effet.
 *
 * Usage :
 *   pgTable("lic_xxx", { ...colonnesMétier, ...timestamps() })
 */
export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  };
}

/**
 * createdAt seul, pour les tables append-only (ex: lic_audit_log,
 * lic_fichiers_log, lic_batch_executions).
 *
 * Usage :
 *   pgTable("lic_xxx", { ...colonnesMétier, ...createdAtOnly() })
 */
export function createdAtOnly() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  };
}
