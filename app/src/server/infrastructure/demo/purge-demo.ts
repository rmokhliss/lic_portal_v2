// ==============================================================================
// LIC v2 — Purge des données démo (Phase 17 F2)
//
// Outil SADMIN exposé via /settings/demo. TRUNCATE des tables métier en
// préservant : utilisateurs, settings, référentiels paramétrables, catalogue
// jobs batch. Utilise Drizzle directement (bypass use-cases) — acceptable
// pour un outil SADMIN dédié à la maintenance démo.
//
// Ordre des TRUNCATE pensé pour respecter les FK : on utilise CASCADE pour
// simplifier (les tables dépendantes sont vidées en chaîne — comportement
// voulu ici, on veut tout flush). RESTART IDENTITY pour rebooter les serial
// (ex: lic_articles.id, lic_produits.id).
// ==============================================================================

import "server-only";

import { sql as rawSql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("infrastructure/demo/purge-demo");

/** Liste des tables métier purgées. Ordre indicatif ; CASCADE gère les FK. */
const PURGE_TABLES: readonly string[] = [
  "lic_audit_log",
  "lic_article_volume_history",
  "lic_licence_articles",
  "lic_licence_produits",
  "lic_renouvellements",
  "lic_fichiers_log",
  "lic_alert_configs",
  "lic_notifications",
  "lic_batch_logs",
  "lic_batch_executions",
  "lic_contacts",
  "lic_entites",
  "lic_licences",
  "lic_clients",
  "lic_articles",
  "lic_produits",
];

export async function purgeDemoData(): Promise<void> {
  log.warn({ count: PURGE_TABLES.length }, "Purge démo lancée — TRUNCATE CASCADE");
  // TRUNCATE en une seule commande (atomicité PG) — RESTART IDENTITY remet
  // les serial à 1, CASCADE flush automatiquement les dépendances oubliées.
  const tableList = PURGE_TABLES.join(", ");
  await rawSql.unsafe(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
  // Reset séquence référence licence (créée migration 0013) pour redémarrer
  // les références à LIC-{YYYY}-001 après purge.
  await rawSql`ALTER SEQUENCE lic_licence_reference_seq RESTART WITH 1`;
  log.warn("Purge démo terminée");
}
