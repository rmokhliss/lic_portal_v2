// ==============================================================================
// LIC v2 — /batches (Phase 8.D, EC-12)
// Tableau jobs + 5 dernières exécutions chacun + drill-down logs.
// ==============================================================================

import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { db } from "@/server/infrastructure/db/client";
import {
  batchExecutions,
  batchJobs,
  batchLogs,
} from "@/server/modules/batch/adapters/postgres/schema";

import {
  BatchesPanel,
  type BatchExecutionDTO,
  type BatchJobItem,
  type BatchLogDTO,
} from "./_components/BatchesPanel";

const RECENT_EXECS_PER_JOB = 5;

export default async function BatchesPage() {
  const user = await requireAuthPage();
  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  const jobs = await db.select().from(batchJobs).orderBy(batchJobs.code);

  // Pour chaque job, prendre les 5 dernières exécutions ordre createdAt DESC.
  const executionsByJob: Record<string, BatchExecutionDTO[]> = {};
  for (const job of jobs) {
    const execs = await db
      .select()
      .from(batchExecutions)
      .where(eq(batchExecutions.jobCode, job.code))
      .orderBy(desc(batchExecutions.createdAt))
      .limit(RECENT_EXECS_PER_JOB);
    executionsByJob[job.code] = execs.map((e) => ({
      id: e.id,
      status: e.status,
      declencheur: e.declencheur,
      startedAt: e.startedAt === null ? null : e.startedAt.toISOString(),
      endedAt: e.endedAt === null ? null : e.endedAt.toISOString(),
      errorMessage: e.errorMessage,
      stats: e.stats,
    }));
  }

  // Logs pour les exécutions affichées (1 batch SELECT pour limiter les RTT).
  const allExecIds = Object.values(executionsByJob).flatMap((execs) => execs.map((e) => e.id));
  const logsByExecution: Record<string, BatchLogDTO[]> = {};
  if (allExecIds.length > 0) {
    const allLogs = await db
      .select()
      .from(batchLogs)
      .where(inArray(batchLogs.executionId, allExecIds))
      .orderBy(desc(batchLogs.createdAt))
      .limit(500);
    for (const log of allLogs) {
      const list = logsByExecution[log.executionId] ?? [];
      list.push({
        id: log.id,
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      });
      logsByExecution[log.executionId] = list;
    }
  }

  const items: BatchJobItem[] = jobs.map((j) => ({
    code: j.code,
    libelle: j.libelle,
    description: j.description,
    schedule: j.schedule,
    lastExecution: (executionsByJob[j.code] ?? [])[0] ?? null,
  }));

  return (
    <div className="p-6">
      <BatchesPanel
        jobs={items}
        executionsByJob={executionsByJob}
        logsByExecution={logsByExecution}
        canRun
      />
    </div>
  );
}
