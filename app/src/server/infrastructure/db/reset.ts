// ==============================================================================
// LIC v2 — Script CLI reset complet de la BD (DEV / INTÉGRATION UNIQUEMENT)
//
// Lancé par `pnpm db:reset`. TRUNCATE CASCADE toutes les tables applicatives
// `lic_*` en une seule instruction. Les tables internes Drizzle
// (`drizzle.__drizzle_migrations`) ne sont PAS vidées — le registre des
// migrations appliquées reste cohérent, donc un `db:migrate` suivant est un
// no-op (idempotent) avant le re-seed.
//
// Pipeline complet d'init/reset propre :
//   pnpm db:reset           → vide les données applicatives
//   pnpm db:migrate         → no-op (migrations déjà enregistrées)
//   pnpm db:seed:bootstrap  → réinjecte SYS-000 + référentiels + comptes BO
//
// Ou en une seule commande : `pnpm db:reset:full` (cf. app/package.json).
//
// ⚠️  REFUSE de tourner si NODE_ENV=production — garde-fou minimal contre
//     une exécution accidentelle sur un environnement live.
//
// Connexion dédiée max=1 fermée explicitement (même pattern que migrate.ts).
// ==============================================================================

// Side-effect import en PREMIER : charge .env avant que infrastructure/env
// ne soit évalué (cf. migrate.ts).
import "../../../../scripts/load-env";

import postgres from "postgres";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/reset");

async function runReset(): Promise<void> {
  if (env.NODE_ENV === "production") {
    log.error("db:reset INTERDIT en NODE_ENV=production — abort");
    process.exit(1);
  }

  log.info({ url: env.DATABASE_URL.replace(/:[^:@]*@/, ":***@") }, "Starting db reset");

  const resetClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    // TRUNCATE CASCADE sur les tables "racines" (référentiels + users + settings
    // + catalogue jobs). CASCADE propage automatiquement à toutes les tables
    // qui les référencent en FK (lic_clients, lic_licences, lic_entites,
    // lic_articles_ref, lic_produits_ref, lic_notifications, audit, etc.).
    // RESTART IDENTITY pour reset les séquences (idempotent).
    await resetClient`
      TRUNCATE
        lic_team_members,
        lic_clients_ref,
        lic_regions_ref,
        lic_pays_ref,
        lic_devises_ref,
        lic_langues_ref,
        lic_types_contact_ref,
        lic_users,
        lic_settings,
        lic_batch_jobs
      RESTART IDENTITY CASCADE
    `;

    log.info("Reset terminé");
  } finally {
    await resetClient.end();
  }
}

runReset().catch((err: unknown) => {
  log.error({ err }, "Reset failed");
  process.exit(1);
});
