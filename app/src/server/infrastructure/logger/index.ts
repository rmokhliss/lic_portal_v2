// ==============================================================================
// LIC v2 — Logger Pino structuré (Référentiel §4.2 — pas de console.log)
//
// - Dev (NODE_ENV=development) : transport pino-pretty pour lisibilité console.
// - Test/prod : JSON structuré sur stdout (lisible par OTel/Loki/Datadog).
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

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { app: "lic" },
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
