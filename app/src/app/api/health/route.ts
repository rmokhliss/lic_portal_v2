// ==============================================================================
// LIC v2 — Endpoint /api/health (DEPRECATED Phase 15 — alias /api/health/ready)
//
// Compat ascendante : Phase 1 → 14 utilisaient `/api/health` comme probe unique
// (process + DB). Phase 15 (Référentiel v2.1 §4.19) sépare en deux probes
// Kubernetes :
//   - `/api/health/live`  : liveness (process up uniquement, pas de check DB)
//   - `/api/health/ready` : readiness (process up + DB up via SELECT 1)
//
// Cette route reste fonctionnelle et délègue à la logique readiness pour ne
// pas casser les configs Docker/k8s existantes (Phase 13.E `Dockerfile`
// HEALTHCHECK pointe encore ici). À retirer Phase 16+ une fois les configs
// migrées vers `/api/health/ready`.
// ==============================================================================

import { GET as readyGet } from "./ready/route";

export const GET = readyGet;
