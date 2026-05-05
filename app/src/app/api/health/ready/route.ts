// ==============================================================================
// LIC v2 — Endpoint /api/health/ready (Phase 15 — Référentiel v2.1 §4.19)
//
// Probe Kubernetes **readiness**. Vérifie que le process est prêt à recevoir
// du trafic : process up + DB up (SELECT 1).
//
// Sémantique k8s :
//   - 200 → "envoie du trafic, je peux servir"
//   - 503 → "ne m'envoie plus de trafic temporairement (DB down, démarrage…)"
//
// Le payload 503 ne renvoie QUE le code public SPX-LIC-900. Aucune fuite de
// message, stack ou cause (l'erreur originale postgres.js peut contenir
// hostname/user/port). Logique recopiée de l'ancien /api/health (Phase 1).
// ==============================================================================

import { sql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";
import { InternalError } from "@/server/modules/error";

const log = createChildLogger("api/health/ready");

export async function GET(): Promise<Response> {
  try {
    await sql`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" }, { status: 200 });
  } catch (caughtError: unknown) {
    log.error({ err: caughtError }, "Readiness probe DB failed");

    // Wrapping pour cohérence cross-module (matérialise la sémantique typée
    // SPX-LIC-900). Le payload client ne contient que le code public.
    const appErr = new InternalError({
      code: "SPX-LIC-900",
      message: "Readiness probe DB failed",
      cause: caughtError,
    });

    return Response.json({ status: "ko", db: "error", code: appErr.code }, { status: 503 });
  }
}
