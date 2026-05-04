// ==============================================================================
// LIC v2 — Script one-shot : backfill certificats clients (Phase 3.E)
//
// Usage : `pnpm script:backfill-client-certs`
//
// Itère lic_clients sans cert PKI, génère pour chacun une paire RSA-4096 + cert
// X.509 signé par la CA S2M, persiste les 3 colonnes PKI, audite mode SCRIPT.
//
// Pré-requis : la CA doit être générée (sinon throw SPX-LIC-411). Lancer
// d'abord `pnpm dev` puis SADMIN → /settings/security → "Générer la CA".
// ==============================================================================

import "../scripts/load-env";
import "reflect-metadata";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { backfillClientCertificatesUseCase } from "../src/server/composition-root";
import { env } from "../src/server/infrastructure/env";
import { createChildLogger } from "../src/server/infrastructure/logger";

const logger = createChildLogger("scripts/backfill-client-certs");

async function main(): Promise<void> {
  logger.info("Backfill client certificates — démarrage");

  const pending = await backfillClientCertificatesUseCase.countPending();
  if (pending === 0) {
    logger.info("Aucun client en attente de certificat — sortie sans action");
    return;
  }
  logger.info({ pending }, "Clients en attente — début du traitement");

  const result = await backfillClientCertificatesUseCase.execute({
    appMasterKey: env.APP_MASTER_KEY,
    systemUserId: SYSTEM_USER_ID,
    systemUserDisplay: SYSTEM_USER_DISPLAY,
  });

  logger.info(
    {
      processed: result.processed,
      failed: result.failed.length,
    },
    "Backfill terminé",
  );

  if (result.failed.length > 0) {
    for (const f of result.failed) {
      logger.error({ clientId: f.clientId, codeClient: f.codeClient, error: f.error }, "ÉCHEC");
    }
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err: unknown) => {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "Fatal");
    process.exit(2);
  });
