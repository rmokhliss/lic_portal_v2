// ==============================================================================
// LIC v2 — Rechargement des données démo (Phase 17 F2 + Phase 20 R-35 +
//          Phase 22 R-36 + Phase 23 R-42/R-43)
//
// Réexécute le pipeline seed Phase 4-7 + Phase 17 D5 + Phase 18 D5/R-22
// directement (pas de subprocess). Idempotent : les seeds early-return si
// déjà peuplés. Utiliser après `purgeDemoData()` pour un reset complet.
//
// Phase 20 R-35 — chaque step encapsulée dans un wrapper qui log + propage
// un message d'erreur clair (au lieu d'un crash 500 opaque côté UI).
//
// Phase 22 R-36 — alertes seedées AVANT notifications (alignement docs F2 :
// alerts puis notifs). Ordre strict respecte les dépendances FK :
//   Phase 2 settings (R-42 Phase 23) — défauts critiques /settings/general
//   Phase 4 (clients/entités/contacts) — pré-requis pour 5/6/7/8-alerts/10
//   Phase 5 (licences/renouvellements) — pré-requis pour 6/7/8-notifs/10
//   Phase 6 (catalogue + liaisons) — pré-requis pour /licences/[id]/articles
//   Phase 7 (volume_history R-43 Phase 23) — pré-requis pour EC-09 / EC-04
//   Phase 8 R-03 (alertes) — dépend de clients seedés
//   Phase 8 D5 (notifications) — dépend de SADMIN user (préservé par purge)
//   Phase 18 R-22 (fichiers démo) — dépend de licences seedées
//
// Phase 23 R-42 — `lic_settings` n'est PAS purgée (cf. purge-demo.ts) mais on
// re-amorce les 5 clés défaut critiques (idempotent ON CONFLICT DO NOTHING)
// pour garantir un état cohérent même si la BD a été reset sans `pnpm db:seed`.
//
// Idempotence (R-36) : chaque seed a son propre garde-fou (early return sur
// COUNT >0 ou tag DEMO_SEED). Le wrapper `step()` ci-dessous logue en INFO
// si un seed skip — utile pour distinguer "skipped idempotent" d'un échec.
//
// On n'appelle PAS seedRegions/seedPays/seedDevises/seedLangues/
// seedTypesContact/seedTeamMembers/seedUsers — ces référentiels ne sont pas
// purgés et le seed bootstrap est idempotent ON CONFLICT DO NOTHING au boot
// du process.
// ==============================================================================

import "server-only";

import { sql as rawSql } from "@/server/infrastructure/db/client";
import { createChildLogger } from "@/server/infrastructure/logger";
import { seedDefaultSettings } from "@/server/infrastructure/db/seed/phase2-settings.seed";
import { seedPhase4Clients } from "@/server/infrastructure/db/seed/phase4-clients.seed";
import { seedPhase5Licences } from "@/server/infrastructure/db/seed/phase5-licences.seed";
import { seedPhase6Catalogue } from "@/server/infrastructure/db/seed/phase6-catalogue.seed";
import { seedPhase7VolumeSnapshots } from "@/server/infrastructure/db/seed/phase7-volume-snapshots.seed";
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
  await step("phase2-settings", () => seedDefaultSettings(rawSql));
  await step("phase4-clients", () => seedPhase4Clients(rawSql));
  await step("phase5-licences", () => seedPhase5Licences(rawSql));
  await step("phase6-catalogue", () => seedPhase6Catalogue(rawSql));
  await step("phase7-volume-snapshots", () => seedPhase7VolumeSnapshots(rawSql));
  await step("phase8-alerts", () => seedPhase8Alerts(rawSql));
  await step("phase8-notifications", () => seedPhase8Notifications(rawSql));
  await step("phase10-fichiers", () => seedPhase10Fichiers(rawSql));
  log.warn("Rechargement démo terminé");
}
