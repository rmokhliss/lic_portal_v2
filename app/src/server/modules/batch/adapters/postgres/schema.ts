// ==============================================================================
// LIC v2 — lic_batch_jobs / lic_batch_executions / lic_batch_logs (Phase 8 8.A)
//
// Suivi des jobs pg-boss côté UI (EC-12). Ce sont CES tables que l'écran lit,
// PAS les tables internes pg-boss qui ne sont pas la surface publique.
//
//   - lic_batch_jobs       : 1 row par job logique (catalogue + dernière exécution)
//   - lic_batch_executions : 1 row par run (start/end/status)
//   - lic_batch_logs       : logs détaillés (1 ligne par log)
//
// Pas d'audit (données opérationnelles techniques).
// ==============================================================================

import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { createdAtOnly, primaryUuid, referenceUuid } from "@/server/infrastructure/db/columns";

export const batchStatus = pgEnum("batch_status_enum", [
  "QUEUED",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "CANCELLED",
]);
export const batchDeclencheur = pgEnum("batch_declencheur_enum", ["SCHEDULED", "MANUAL"]);
export const logLevel = pgEnum("log_level_enum", ["DEBUG", "INFO", "WARN", "ERROR"]);

export const batchJobs = pgTable("lic_batch_jobs", {
  /** Slug stable, ex: 'snapshot-volumes', 'check-alerts'. */
  code: varchar("code", { length: 50 }).primaryKey(),
  libelle: varchar("libelle", { length: 200 }).notNull(),
  description: varchar("description", { length: 1000 }),
  /** Cron expression (info — l'orchestration réelle vit dans pg-boss). */
  schedule: varchar("schedule", { length: 100 }),
  /** Mise à jour à chaque exécution réussie pour pré-affichage UI.
   *  Pas de FK formelle (cycle batch_jobs ↔ batch_executions) — intégrité
   *  maintenue côté applicatif uniquement. */
  lastExecutionId: uuid("last_execution_id"),
  ...createdAtOnly(),
});

export const batchExecutions = pgTable(
  "lic_batch_executions",
  {
    id: primaryUuid(),
    jobCode: varchar("job_code", { length: 50 })
      .notNull()
      .references(() => batchJobs.code),
    declencheur: batchDeclencheur("declencheur").notNull().default("SCHEDULED"),
    status: batchStatus("status").notNull().default("QUEUED"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** Statistiques résumées : nb traités, nb erreurs, etc. */
    stats: jsonb("stats").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    ...createdAtOnly(),
  },
  (table) => [
    index("idx_batch_exec_job_created").on(table.jobCode, table.createdAt),
    index("idx_batch_exec_status").on(table.status),
  ],
);

export const batchLogs = pgTable(
  "lic_batch_logs",
  {
    id: primaryUuid(),
    executionId: referenceUuid("execution_id", () => batchExecutions.id).notNull(),
    level: logLevel("level").notNull().default("INFO"),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...createdAtOnly(),
  },
  (table) => [index("idx_batch_logs_execution").on(table.executionId, table.createdAt)],
);
