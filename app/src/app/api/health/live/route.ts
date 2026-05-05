// ==============================================================================
// LIC v2 — Endpoint /api/health/live (Phase 15 — Référentiel v2.1 §4.19)
//
// Probe Kubernetes **liveness**. Vérifie uniquement que le process Node est up
// et capable de répondre. PAS de check DB / SMTP / pg-boss.
//
// Sémantique k8s :
//   - 200 → "process vivant, ne pas redémarrer le pod"
//   - 503 → "process irrécupérable, redémarrer le pod"
//
// Anti-pattern explicite : ne pas inclure de check DB ici. Une DB temporairement
// indisponible NE doit PAS déclencher un restart de pod (cf. Référentiel v2.1
// §4.19 — distinguer probe de redémarrage vs probe de routage trafic).
// ==============================================================================

export function GET(): Response {
  return Response.json({ status: "ok", uptime: process.uptime() }, { status: 200 });
}
