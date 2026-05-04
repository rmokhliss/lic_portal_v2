// ==============================================================================
// LIC v2 — Worker pg-boss (Phase 8.C entry point)
//
// Lancé via `pnpm worker:dev` (ou container dédié en prod). Initialise pg-boss
// sur la même Postgres, register 3 jobs handlers + cron schedules.
//
// Les schedules sont en CRON UTC :
//   - snapshot-volumes : `0 2 1 * *`   (1er jour du mois, 02:00 UTC)
//   - check-alerts     : `0 3 * * *`   (chaque jour, 03:00 UTC)
//   - expire-licences  : `0 4 * * *`   (chaque jour, 04:00 UTC)
//
// Lancement immédiat possible via `boss.send(jobCode)` (CLI manuel, EC-12
// "Lancer maintenant").
// ==============================================================================

import "../../../scripts/load-env";

import PgBoss from "pg-boss";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";

import { runCheckAlerts } from "./handlers/check-alerts.handler";
import { runExpireLicences } from "./handlers/expire-licences.handler";
import { runSnapshotVolumes } from "./handlers/snapshot-volumes.handler";

const log = createChildLogger("jobs/worker");

const SCHEDULES: readonly {
  code: string;
  cron: string;
  handler: (declencheur: "SCHEDULED" | "MANUAL") => Promise<unknown>;
}[] = [
  {
    code: "snapshot-volumes",
    cron: "0 2 1 * *",
    handler: runSnapshotVolumes,
  },
  {
    code: "check-alerts",
    cron: "0 3 * * *",
    handler: runCheckAlerts,
  },
  {
    code: "expire-licences",
    cron: "0 4 * * *",
    handler: runExpireLicences,
  },
];

async function main(): Promise<void> {
  log.info({ url: env.DATABASE_URL.replace(/:[^:@]*@/, ":***@") }, "Worker starting");
  const boss = new PgBoss(env.DATABASE_URL);
  await boss.start();

  for (const schedule of SCHEDULES) {
    await boss.work(schedule.code, async () => {
      await schedule.handler("SCHEDULED");
    });
    await boss.schedule(schedule.code, schedule.cron);
    log.info({ code: schedule.code, cron: schedule.cron }, "Job scheduled");
  }

  log.info("Worker ready — waiting for scheduled jobs and manual triggers");

  // Maintien du process en vie. SIGINT/SIGTERM → arrêt propre.
  const shutdown = async (signal: string): Promise<void> => {
    log.info({ signal }, "Worker shutting down");
    await boss.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((err: unknown) => {
  log.error({ err }, "Worker bootstrap failed");
  process.exit(1);
});
