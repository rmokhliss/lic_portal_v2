// ==============================================================================
// LIC v2 — Rechargement des données démo (Phase 17 F2)
//
// Réexécute le pipeline seed Phase 4-6 + Phase 17 D5 directement (pas de
// subprocess). Idempotent : les seeds early-return si déjà peuplés. Utiliser
// après `purgeDemoData()` pour un reset complet.
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
import { seedPhase8Notifications } from "@/server/infrastructure/db/seed/phase8-notifications.seed";

const log = createChildLogger("infrastructure/demo/reload-demo");

export async function reloadDemoData(): Promise<void> {
  log.warn("Rechargement démo lancé");
  await seedPhase4Clients(rawSql);
  await seedPhase5Licences(rawSql);
  await seedPhase6Catalogue(rawSql);
  await seedPhase8Notifications(rawSql);
  log.warn("Rechargement démo terminé");
}
