// ==============================================================================
// LIC v2 — Trigger manuel d'un job (Phase 8.C)
//
// Exposé via Server Action côté UI EC-12 ("Lancer maintenant"). Bypass
// pg-boss et invoque le handler directement (declencheur=MANUAL). Le résultat
// est tracé dans lic_batch_executions exactement comme un run scheduled.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

import { runCheckAlerts } from "./handlers/check-alerts.handler";
import { runExpireLicences } from "./handlers/expire-licences.handler";
import { runSnapshotVolumes } from "./handlers/snapshot-volumes.handler";

const HANDLERS: Readonly<Record<string, () => Promise<unknown>>> = {
  "snapshot-volumes": () => runSnapshotVolumes("MANUAL"),
  "check-alerts": () => runCheckAlerts("MANUAL"),
  "expire-licences": () => runExpireLicences("MANUAL"),
};

export async function runJobNow(jobCode: string): Promise<void> {
  const handler = HANDLERS[jobCode];
  if (handler === undefined) {
    throw new ValidationError({
      code: "SPX-LIC-901",
      message: `Unknown job code: ${jobCode}`,
      details: { jobCode },
    });
  }
  await handler();
}

export const KNOWN_JOB_CODES: readonly string[] = Object.keys(HANDLERS);
