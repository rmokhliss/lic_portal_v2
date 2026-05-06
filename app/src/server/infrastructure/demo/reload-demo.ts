// ==============================================================================
// LIC v2 — Rechargement des données démo (Phase 17 F2 + Phase 20 R-35)
//
// Réexécute le pipeline seed Phase 4-6 + Phase 17 D5 + Phase 18 D5/R-22
// directement (pas de subprocess). Idempotent : les seeds early-return si
// déjà peuplés. Utiliser après `purgeDemoData()` pour un reset complet.
//
// Phase 20 R-35 — chaque step encapsulée dans un wrapper qui log + propage
// un message d'erreur clair (au lieu d'un crash 500 opaque côté UI). L'ordre
// strict respecte les dépendances FK :
//   Phase 4 (clients/entités/contacts) — pré-requis pour 5/6/8-alerts/10
//   Phase 5 (licences/renouvellements) — pré-requis pour 6/8-notifs/10
//   Phase 6 (catalogue + liaisons + volume_history) — pré-requis pour
//     les écrans /licences/[id]/articles + /volumes
//   Phase 8 D5 (notifications) — dépend de SADMIN user (préservé par purge)
//   Phase 18 R-03 (alertes) — dépend de clients seedés
//   Phase 18 R-22 (fichiers démo) — dépend de licences seedées
//
// Note : on n'appelle PAS seedRegions/seedPays/seedDevises/seedLangues/
// seedTypesContact/seedTeamMembers/seedUsers/seedSettings — ces référentiels
// ne sont pas purgés par F2 (voir purge-demo.ts) et le seed bootstrap est
// idempotent ON CONFLICT DO NOTHING.
// ==============================================================================

import "server-only";

import { sql as rawSql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";
import { seedPhase4Clients } from "@/server/infrastructure/db/seed/phase4-clients.seed";
import { seedPhase5Licences } from "@/server/infrastructure/db/seed/phase5-licences.seed";
import { seedPhase6Catalogue } from "@/server/infrastructure/db/seed/phase6-catalogue.seed";
import { seedPhase8Alerts } from "@/server/infrastructure/db/seed/phase8-alerts.seed";
import { seedPhase8Notifications } from "@/server/infrastructure/db/seed/phase8-notifications.seed";
import { seedPhase10Fichiers } from "@/server/infrastructure/db/seed/phase10-fichiers.seed";
import { InternalError } from "@/server/modules/error";

const log = createChildLogger("infrastructure/demo/reload-demo");

/** Phase 20 R-35 — wrapper qui annote l'étape échouée pour la propagation
 *  vers l'UI Server Action. Ne masque pas la cause originelle (chaînée). */
async function step(name: string, fn: () => Promise<void>): Promise<void> {
  log.info({ step: name }, "Reload démo — étape démarrée");
  try {
    await fn();
    log.info({ step: name }, "Reload démo — étape terminée");
  } catch (err) {
    const causeMessage = err instanceof Error ? err.message : String(err);
    log.error({ step: name, error: causeMessage }, "Reload démo — étape échouée");
    throw new InternalError({
      code: "SPX-LIC-900",
      message: `Échec rechargement démo à l'étape "${name}" : ${causeMessage}`,
      cause: err,
    });
  }
}

export async function reloadDemoData(): Promise<void> {
  log.warn("Rechargement démo lancé");
  await step("phase4-clients", () => seedPhase4Clients(rawSql));
  await step("phase5-licences", () => seedPhase5Licences(rawSql));
  await step("phase6-catalogue", () => seedPhase6Catalogue(rawSql));
  await step("phase8-notifications", () => seedPhase8Notifications(rawSql));
  await step("phase8-alerts", () => seedPhase8Alerts(rawSql));
  await step("phase10-fichiers", () => seedPhase10Fichiers(rawSql));
  log.warn("Rechargement démo terminé");
}
