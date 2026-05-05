// ==============================================================================
// LIC v2 — Script CLI seed BD (Phase 2.B étape 5/7) — DEV / DÉMO UNIQUEMENT
//
// Lancé par `pnpm db:seed`. Enrichit les référentiels paramétrables avec des
// valeurs réalistes (pays africains ISO, devises CFA + maghreb, langues,
// types contacts, team members, comptes BO, settings par défaut).
//
// ⚠️  NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS D'INTÉGRATION.
// Les tests `*.int.spec.ts` sont écrits contre l'état bootstrap-only (les
// 4 INSERTs de la migration 0003 + le SYS-000 de la 0000) et utilisent
// `setupTransactionalTests` (BEGIN/ROLLBACK). Le seed insère des données
// COMMITTÉES qui survivent au ROLLBACK et cassent les assertions
// dépendantes de count/contenu (≥23 tests confirmés).
//
// Usage attendu : BD locale dev, démos client, environnements préprod
// peuplés à la main. Pour les tests, repartir d'une BD reset (drop +
// migrate) sans seed.
//
// IDEMPOTENT : tous les INSERTs utilisent ON CONFLICT DO NOTHING sur leur
// colonne UNIQUE business. team_members (sans UNIQUE) utilise WHERE NOT EXISTS
// sur l'email pour éviter les doublons.
//
// Ordre :
//   1. lic_regions_ref (8 régions)         — base FK des pays/team_members
//   2. lic_pays_ref (~30 pays)
//   3. lic_devises_ref (compléments + bootstrap)
//   4. lic_langues_ref (ar, pt, es)
//   5. lic_types_contact_ref (compléments)
//   6. lic_team_members (6 membres fictifs S2M)
//   7. lic_users (5 comptes BO)
//   8. lic_settings (9 clés par défaut data-model.md)
//   9. Phase 4.D — clients + entités + contacts via seedPhase4Clients
//      (passe par les repositories, audit mode='SEED', idempotent)
//
// Connexion dédiée max=1 fermée à la fin (cf. migrate.ts).
// ==============================================================================

import "../../../../scripts/load-env";

import bcryptjs from "bcryptjs";
import postgres from "postgres";

import { seedPhase4Clients } from "./seed/phase4-clients.seed";
import { seedPhase5Licences } from "./seed/phase5-licences.seed";
import { seedPhase6Catalogue } from "./seed/phase6-catalogue.seed";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed");

// Mot de passe par défaut pour les 5 comptes BO seedés. must_change_password
// est posé à true → forcera le changement au premier login.
const DEFAULT_PASSWORD = "ChangeMe-2026!";
const BCRYPT_COST = 10;

async function seedRegions(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_regions_ref");
  await sql`
    INSERT INTO lic_regions_ref (region_code, nom, dm_responsable) VALUES
      ('NORD_AFRIQUE',     'Afrique du Nord',          'Karim ZAOUI'),
      ('AFRIQUE_OUEST',    'Afrique de l''Ouest',      'Aminata DIALLO'),
      ('AFRIQUE_CENTRALE', 'Afrique Centrale',         'Jean-Paul OBONO'),
      ('AFRIQUE_EST',      'Afrique de l''Est',        'David MUTUA'),
      ('AFRIQUE_AUSTRALE', 'Afrique Australe',         'Thabo NDLOVU'),
      ('OCEAN_INDIEN',     'Océan Indien',             'Hary RANDRIA'),
      ('DIASPORA',         'Diaspora (clients hors Afrique)', NULL),
      ('INTERNE',          'Interne S2M (tests / démos)',     NULL)
    ON CONFLICT (region_code) DO NOTHING
  `;
}

async function seedPays(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_pays_ref");
  // Mapping ISO 3166-1 alpha-2 → région commerciale S2M.
  await sql`
    INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
      -- Afrique du Nord (5)
      ('MA', 'Maroc',          'NORD_AFRIQUE'),
      ('DZ', 'Algérie',        'NORD_AFRIQUE'),
      ('TN', 'Tunisie',        'NORD_AFRIQUE'),
      ('EG', 'Égypte',         'NORD_AFRIQUE'),
      ('LY', 'Libye',          'NORD_AFRIQUE'),
      -- Afrique de l'Ouest (9)
      ('SN', 'Sénégal',        'AFRIQUE_OUEST'),
      ('CI', 'Côte d''Ivoire', 'AFRIQUE_OUEST'),
      ('ML', 'Mali',           'AFRIQUE_OUEST'),
      ('BF', 'Burkina Faso',   'AFRIQUE_OUEST'),
      ('NE', 'Niger',          'AFRIQUE_OUEST'),
      ('BJ', 'Bénin',          'AFRIQUE_OUEST'),
      ('TG', 'Togo',           'AFRIQUE_OUEST'),
      ('GH', 'Ghana',          'AFRIQUE_OUEST'),
      ('NG', 'Nigéria',        'AFRIQUE_OUEST'),
      -- Afrique Centrale (4)
      ('CM', 'Cameroun',       'AFRIQUE_CENTRALE'),
      ('GA', 'Gabon',          'AFRIQUE_CENTRALE'),
      ('CG', 'Congo',          'AFRIQUE_CENTRALE'),
      ('CD', 'République démocratique du Congo', 'AFRIQUE_CENTRALE'),
      -- Afrique de l'Est (6)
      ('KE', 'Kenya',          'AFRIQUE_EST'),
      ('TZ', 'Tanzanie',       'AFRIQUE_EST'),
      ('UG', 'Ouganda',        'AFRIQUE_EST'),
      ('RW', 'Rwanda',         'AFRIQUE_EST'),
      ('ET', 'Éthiopie',       'AFRIQUE_EST'),
      ('SS', 'Soudan du Sud',  'AFRIQUE_EST'),
      -- Afrique Australe (5)
      ('ZA', 'Afrique du Sud', 'AFRIQUE_AUSTRALE'),
      ('ZW', 'Zimbabwe',       'AFRIQUE_AUSTRALE'),
      ('MZ', 'Mozambique',     'AFRIQUE_AUSTRALE'),
      ('AO', 'Angola',         'AFRIQUE_AUSTRALE'),
      ('BW', 'Botswana',       'AFRIQUE_AUSTRALE'),
      -- Océan Indien (2)
      ('MG', 'Madagascar',     'OCEAN_INDIEN'),
      ('MU', 'Maurice',        'OCEAN_INDIEN')
    ON CONFLICT (code_pays) DO NOTHING
  `;
}

async function seedDevises(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_devises_ref");
  // Bootstrap (MAD/EUR/USD/XOF/XAF) déjà inséré par migration 0003. Compléments.
  await sql`
    INSERT INTO lic_devises_ref (code_devise, nom, symbole) VALUES
      ('TND', 'Dinar tunisien',     'DT'),
      ('DZD', 'Dinar algérien',     'DA'),
      ('EGP', 'Livre égyptienne',   'E£'),
      ('GHS', 'Cedi ghanéen',       'GH₵'),
      ('NGN', 'Naira nigérian',     '₦'),
      ('KES', 'Shilling kényan',    'KSh'),
      ('ETB', 'Birr éthiopien',     'Br'),
      ('ZAR', 'Rand sud-africain',  'R'),
      ('MUR', 'Roupie mauricienne', '₨'),
      ('MGA', 'Ariary malgache',    'Ar')
    ON CONFLICT (code_devise) DO NOTHING
  `;
}

async function seedLangues(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_langues_ref");
  // Bootstrap (fr, en) déjà inséré par migration 0003. Compléments.
  await sql`
    INSERT INTO lic_langues_ref (code_langue, nom) VALUES
      ('ar', 'العربية'),
      ('pt', 'Português'),
      ('es', 'Español')
    ON CONFLICT (code_langue) DO NOTHING
  `;
}

async function seedTypesContact(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_types_contact_ref");
  // Bootstrap (ACHAT, FACTURATION, TECHNIQUE) déjà inséré par migration 0003.
  await sql`
    INSERT INTO lic_types_contact_ref (code, libelle) VALUES
      ('JURIDIQUE',    'Juridique'),
      ('TECHNIQUE_F2', 'Technique F2 (intégration)'),
      ('DIRECTION',    'Direction')
    ON CONFLICT (code) DO NOTHING
  `;
}

async function seedTeamMembers(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_team_members");
  // Pas de UNIQUE constraint en BD → idempotence par WHERE NOT EXISTS sur email.
  // 2 SALES + 2 AM (sans regionCode) + 2 DM (avec regionCode — convention métier).
  const seeds: readonly {
    nom: string;
    prenom: string;
    email: string;
    roleTeam: "SALES" | "AM" | "DM";
    regionCode: string | null;
  }[] = [
    {
      nom: "DUPONT",
      prenom: "Alice",
      email: "alice.dupont@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    {
      nom: "MARTIN",
      prenom: "Bob",
      email: "bob.martin@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    {
      nom: "LEROY",
      prenom: "Carole",
      email: "carole.leroy@s2m.ma",
      roleTeam: "AM",
      regionCode: null,
    },
    {
      nom: "BENALI",
      prenom: "David",
      email: "david.benali@s2m.ma",
      roleTeam: "AM",
      regionCode: null,
    },
    {
      nom: "ZAOUI",
      prenom: "Karim",
      email: "karim.zaoui@s2m.ma",
      roleTeam: "DM",
      regionCode: "NORD_AFRIQUE",
    },
    {
      nom: "DIALLO",
      prenom: "Aminata",
      email: "aminata.diallo@s2m.ma",
      roleTeam: "DM",
      regionCode: "AFRIQUE_OUEST",
    },
  ];

  for (const m of seeds) {
    await sql`
      INSERT INTO lic_team_members (nom, prenom, email, role_team, region_code)
      SELECT ${m.nom}, ${m.prenom}, ${m.email}, ${m.roleTeam}, ${m.regionCode}
      WHERE NOT EXISTS (
        SELECT 1 FROM lic_team_members WHERE email = ${m.email}
      )
    `;
  }
}

async function seedUsers(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_users");
  // Hash partagé par les 5 comptes (mot de passe identique).
  const passwordHash = await bcryptjs.hash(DEFAULT_PASSWORD, BCRYPT_COST);

  const seeds: readonly {
    matricule: string;
    nom: string;
    prenom: string;
    email: string;
    role: "SADMIN" | "ADMIN" | "USER";
  }[] = [
    {
      matricule: "MAT-001",
      nom: "ADMIN",
      prenom: "Système",
      email: "admin@s2m.ma",
      role: "SADMIN",
    },
    {
      matricule: "MAT-002",
      nom: "MANAGER",
      prenom: "Sales",
      email: "sales-admin@s2m.ma",
      role: "ADMIN",
    },
    {
      matricule: "MAT-003",
      nom: "MANAGER",
      prenom: "Account",
      email: "am-admin@s2m.ma",
      role: "ADMIN",
    },
    {
      matricule: "MAT-004",
      nom: "DUBOIS",
      prenom: "Pierre",
      email: "commercial@s2m.ma",
      role: "USER",
    },
    {
      matricule: "MAT-005",
      nom: "BERNARD",
      prenom: "Sophie",
      email: "support@s2m.ma",
      role: "USER",
    },
  ];

  for (const u of seeds) {
    await sql`
      INSERT INTO lic_users (
        matricule, nom, prenom, email, password_hash,
        must_change_password, role, actif
      ) VALUES (
        ${u.matricule}, ${u.nom}, ${u.prenom}, ${u.email}, ${passwordHash},
        true, ${u.role}, true
      )
      ON CONFLICT (matricule) DO NOTHING
    `;
  }
}

async function seedBatchJobsCatalog(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_batch_jobs catalog");
  // Phase 8.C + 9.C — 4 jobs registered in worker.ts. Catalog row = libellé +
  // schedule humain pour l'UI EC-12. Idempotent ON CONFLICT (code).
  await sql`
    INSERT INTO lic_batch_jobs (code, libelle, description, schedule) VALUES
      ('snapshot-volumes', 'Snapshot volumes mensuels',
       'Snapshot mensuel des volumes consommés/autorisés par licence×article — alimente l''historique de volumétrie (EC-09).',
       '0 2 1 * *'),
      ('check-alerts', 'Vérification des alertes',
       'Compare volumes/dates avec les configs d''alertes actives → notifications IN_APP aux ADMIN/SADMIN (EC-07).',
       '0 3 * * *'),
      ('expire-licences', 'Expiration automatique licences',
       'Passe les licences ACTIF dont date_fin < NOW() au statut EXPIRE.',
       '0 4 * * *'),
      ('auto-renew-licences', 'Renouvellement automatique',
       'Crée un renouvellement statut CREE pour les licences renouvellement_auto avec date_fin <= 30j (EC-11).',
       '0 5 * * *')
    ON CONFLICT (code) DO NOTHING
  `;
}

async function seedSettings(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_settings");
  // Schema actuel : key (varchar PK) + value (jsonb). Les valeurs string/numeric
  // sont JSON-encodées avant INSERT. updated_by = SYSTEM_USER_ID (nil uuid seedé
  // par la migration 0000).
  // Données par défaut alignées data-model.md §lic_settings.
  // Phase 14 : healthcheck_shared_aes_key généré via generateAes256Key (clé
  // AES-256 partagée S2M ↔ banque pour chiffrer les `.hc` — ADR-0002 + 0019).
  const { generateAes256Key } = await import("@/server/modules/crypto/domain/aes");
  const seeds: readonly { key: string; value: unknown }[] = [
    { key: "seuil_alerte_defaut", value: 80 },
    { key: "tolerance_volume_pct", value: 5 },
    { key: "tolerance_date_jours", value: 30 },
    { key: "warning_volume_pct", value: 80 },
    { key: "warning_date_jours", value: 60 },
    { key: "licence_file_aes_key", value: "" },
    { key: "healthcheck_aes_key", value: "" },
    { key: "healthcheck_shared_aes_key", value: generateAes256Key() },
    { key: "smtp_configured", value: false },
    { key: "app_name", value: "Portail Licences SELECT-PX" },
  ];

  for (const s of seeds) {
    const jsonValue = JSON.stringify(s.value);
    await sql`
      INSERT INTO lic_settings (key, value, updated_by)
      VALUES (${s.key}, ${jsonValue}::jsonb, ${SYSTEM_USER_ID}::uuid)
      ON CONFLICT (key) DO NOTHING
    `;
  }
}

async function runSeed(): Promise<void> {
  log.info({ url: env.DATABASE_URL.replace(/:[^:@]*@/, ":***@") }, "Starting seed");
  const seedClient = postgres(env.DATABASE_URL, { max: 1 });

  try {
    // Ordre strict : régions avant pays (FK), users avant settings (FK
    // updated_by), bootstrap avant compléments (déjà inséré par migration 0003).
    await seedRegions(seedClient);
    await seedPays(seedClient);
    await seedDevises(seedClient);
    await seedLangues(seedClient);
    await seedTypesContact(seedClient);
    await seedTeamMembers(seedClient);
    await seedUsers(seedClient);
    await seedSettings(seedClient);

    // Phase 4.D — clients/entités/contacts via repositories.
    // Idempotent (early return si lic_clients déjà peuplée).
    await seedPhase4Clients(seedClient);

    // Phase 5.D — licences + renouvellements (dépend Phase 4).
    // Idempotent (early return si lic_licences déjà peuplée).
    await seedPhase5Licences(seedClient);

    // Phase 6.E — catalogue produits/articles + liaisons + volume_history.
    // Idempotent (early return si lic_produits_ref déjà peuplée).
    await seedPhase6Catalogue(seedClient);

    // Phase 8.A — catalogue jobs batch (idempotent).
    await seedBatchJobsCatalog(seedClient);

    log.info("Seed completed successfully");
  } finally {
    await seedClient.end();
  }
}

runSeed().catch((err: unknown) => {
  log.error({ err }, "Seed failed");
  process.exit(1);
});
