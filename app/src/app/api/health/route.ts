// ==============================================================================
// LIC v2 — Endpoint /api/health (Référentiel §1.4 + PROJECT_CONTEXT §8.4)
//
// Endpoint public sans auth : probes Docker/k8s/CI doivent pouvoir l'atteindre
// sans session. Vérifie la chaîne complète env → pool → BD via SELECT 1.
//
//   200 { status: "ok", db: "ok" }
//   503 { status: "ko", db: "error", code: "SPX-LIC-900" }
//
// Le payload 503 ne renvoie QUE le code public. Aucune fuite de message,
// stack ou cause (l'erreur originale postgres.js peut contenir hostname/user
// /port). Le wrapping `InternalError` reste pour cohérence + log serveur.
// ==============================================================================

import { sql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";
import { InternalError } from "@/server/modules/error";

const log = createChildLogger("api/health");

export async function GET(): Promise<Response> {
  try {
    await sql`SELECT 1`;
    return Response.json({ status: "ok", db: "ok" }, { status: 200 });
  } catch (caughtError: unknown) {
    log.error({ err: caughtError }, "Healthcheck DB failed");

    // Wrapping pour cohérence cross-module (matérialise la sémantique typée
    // SPX-LIC-900). Le payload client ne contient que le code public.
    const appErr = new InternalError({
      code: "SPX-LIC-900",
      message: "Healthcheck DB failed",
      cause: caughtError,
    });

    return Response.json({ status: "ko", db: "error", code: appErr.code }, { status: 503 });
  }
}
