// ==============================================================================
// LIC v2 — BatchExecutionTracker (Phase 8.C)
//
// Wrap chaque exécution de job pg-boss avec :
//   - INSERT lic_batch_executions (status=RUNNING, started_at=NOW)
//   - logs INSERT lic_batch_logs au fil du handler
//   - UPDATE final SUCCESS / FAILED + ended_at + stats
//   - UPDATE lic_batch_jobs.last_execution_id
//
// API simple : `await track(jobCode, declencheur, async (log) => { ... })`.
// Le handler interne reçoit un objet `log` avec info/warn/error qui INSERT en BD.
//
// Aucune dépendance domain/application — c'est un utilitaire infrastructure
// directement consommé par les handlers de jobs.
// ==============================================================================

import { eq } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";
import { InternalError } from "@/server/modules/error";
import {
  batchExecutions,
  batchJobs,
  batchLogs,
} from "@/server/modules/batch/adapters/postgres/schema";

const log = createChildLogger("jobs/batch-tracker");

export interface JobLogger {
  info(message: string, metadata?: Record<string, unknown>): Promise<void>;
  warn(message: string, metadata?: Record<string, unknown>): Promise<void>;
  error(message: string, metadata?: Record<string, unknown>): Promise<void>;
}

export type BatchDeclencheur = "SCHEDULED" | "MANUAL";

export interface BatchTrackOutput {
  readonly executionId: string;
  readonly status: "SUCCESS" | "FAILED";
  readonly stats: Record<string, unknown>;
}

export async function track(
  jobCode: string,
  declencheur: BatchDeclencheur,
  handler: (log: JobLogger) => Promise<Record<string, unknown> | undefined>,
): Promise<BatchTrackOutput> {
  const [exec] = await db
    .insert(batchExecutions)
    .values({
      jobCode,
      declencheur,
      status: "RUNNING",
      startedAt: new Date(),
    })
    .returning();
  if (exec === undefined) {
    log.error({ jobCode }, "Failed to create batch_execution row");
    throw new InternalError({
      code: "SPX-LIC-900",
      message: `Failed to create batch_execution for ${jobCode}`,
    });
  }

  const executionId = exec.id;
  const jobLog: JobLogger = {
    async info(message, metadata) {
      await db.insert(batchLogs).values({ executionId, level: "INFO", message, metadata });
      log.info({ jobCode, executionId, ...metadata }, message);
    },
    async warn(message, metadata) {
      await db.insert(batchLogs).values({ executionId, level: "WARN", message, metadata });
      log.warn({ jobCode, executionId, ...metadata }, message);
    },
    async error(message, metadata) {
      await db.insert(batchLogs).values({ executionId, level: "ERROR", message, metadata });
      log.error({ jobCode, executionId, ...metadata }, message);
    },
  };

  try {
    const stats = (await handler(jobLog)) ?? {};
    await db
      .update(batchExecutions)
      .set({ status: "SUCCESS", endedAt: new Date(), stats })
      .where(eq(batchExecutions.id, executionId));
    await db
      .update(batchJobs)
      .set({ lastExecutionId: executionId })
      .where(eq(batchJobs.code, jobCode));
    return { executionId, status: "SUCCESS", stats };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(batchExecutions)
      .set({
        status: "FAILED",
        endedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(batchExecutions.id, executionId));
    await jobLog.error("Job failed with exception", { error: message });
    return { executionId, status: "FAILED", stats: {} };
  }
}
