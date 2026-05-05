// ==============================================================================
// LIC v2 — Logger Pino structuré (Référentiel v2.1 §4.2 + §4.19 redaction PII)
//
// - Dev (NODE_ENV=development) : transport pino-pretty pour lisibilité console.
// - Test/prod : JSON structuré sur stdout (lisible par OTel/Loki/Datadog).
//
// Phase 15 — Redaction PII obligatoire (audit Master Mai 2026, BLOQUANT prod) :
// pino redact remplace par "[REDACTED]" tout champ matchant les paths ci-dessous,
// récursivement à TOUS les niveaux (`*.x` couvre les enfants directs ; pino
// résout aussi `**.x` mais on liste explicitement pour audit + perf).
//
// Catégories couvertes :
//   - Mots de passe : password, passwordHash, hashed_password, currentPassword,
//                     newPassword, generatedPassword, newPasswordTemp
//   - Tokens / auth : token, authorization, headers.authorization, headers.cookie
//   - PCI-DSS      : pan (numéro carte), cvv (cryptogramme)
//
// Risque sans redaction : leak mot de passe en clair / token de session / PAN
// dans les logs Pino → violation PCI-DSS et RGPD avant déploiement client.
//
// Usage :
//   import { logger } from "@/server/infrastructure/logger";
//   logger.info({ event: "boot" }, "App started");
//
// Pour un logger nominatif par module :
//   const log = createChildLogger("client");
//   log.info({ clientId }, "Client created");
// ==============================================================================

import pino, { type Logger } from "pino";
import { env } from "@/server/infrastructure/env";

const usePretty = env.NODE_ENV === "development";

const REDACT_PATHS: readonly string[] = [
  // Mots de passe (top-level + nested)
  "password",
  "passwordHash",
  "hashed_password",
  "currentPassword",
  "newPassword",
  "generatedPassword",
  "newPasswordTemp",
  "*.password",
  "*.passwordHash",
  "*.hashed_password",
  "*.currentPassword",
  "*.newPassword",
  "*.generatedPassword",
  "*.newPasswordTemp",
  // Tokens / authorization
  "token",
  "authorization",
  "*.token",
  "*.authorization",
  "headers.authorization",
  "headers.cookie",
  // PCI-DSS — données carte bancaire (numéro PAN + cryptogramme CVV)
  "pan",
  "cvv",
  "*.pan",
  "*.cvv",
];

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { app: "lic" },
  redact: {
    paths: [...REDACT_PATHS],
    censor: "[REDACTED]",
  },
  ...(usePretty
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export function createChildLogger(module: string): Logger {
  return logger.child({ module });
}
