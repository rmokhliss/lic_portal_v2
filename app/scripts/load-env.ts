// ==============================================================================
// LIC v2 — Loader .env pour les scripts CLI hors Next.js
//
// En local : charge app/.env si le fichier existe.
// En Kubernetes : ne plante pas si .env n'existe pas, car les variables viennent
// de ConfigMap + Secret via process.env.
// ==============================================================================

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}