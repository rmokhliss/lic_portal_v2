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
import { seedPhase8Notifications } from "./seed/phase8-notifications.seed";

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed");

// Mot de passe par défaut pour les 5 comptes BO seedés. must_change_password
// est posé à true → forcera le changement au premier login.
const DEFAULT_PASSWORD = "ChangeMe-2026!";
const BCRYPT_COST = 10;

async function seedRegions(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_regions_ref (Phase 17 D2 — 7 régions v1 réelles)");
  // 7 régions extraites Excel v1 colonne REGIONS — NORD_AFRIQUE conservé
  // (déjà présent migration 0003), 6 autres ajoutées. La paire
  // FRANCOPHONE/ANGLOPHONE remplace l'ancienne géographique OUEST/CENTRALE/EST.
  await sql`
    INSERT INTO lic_regions_ref (region_code, nom, dm_responsable) VALUES
      ('NORD_AFRIQUE',         'Afrique du Nord',     'Karim ZAOUI'),
      ('AFRIQUE_FRANCOPHONE',  'Afrique Francophone', 'Aminata DIALLO'),
      ('AFRIQUE_ANGLOPHONE',   'Afrique Anglophone',  'David MUTUA'),
      ('ASIE',                 'Asie',                'Hary RANDRIA'),
      ('EUROPE',               'Europe',              NULL),
      ('MOYEN_ORIENT',         'Moyen-Orient',        'Omar AL-FARSI'),
      ('AUSTRALIE',            'Australie / Océanie', NULL)
    ON CONFLICT (region_code) DO NOTHING
  `;

  // Cleanup régions legacy hors v1 — FK-safe (skip si pays ou team_member
  // référence encore la région). Premier passage post-migration : peut échouer
  // si données démo n'ont pas été purgées via /settings/demo Phase 17 F2.
  await sql`
    DELETE FROM lic_regions_ref
    WHERE region_code NOT IN (
      'NORD_AFRIQUE', 'AFRIQUE_FRANCOPHONE', 'AFRIQUE_ANGLOPHONE',
      'ASIE', 'EUROPE', 'MOYEN_ORIENT', 'AUSTRALIE'
    )
    AND NOT EXISTS (
      SELECT 1 FROM lic_pays_ref p WHERE p.region_code = lic_regions_ref.region_code
    )
    AND NOT EXISTS (
      SELECT 1 FROM lic_team_members t WHERE t.region_code = lic_regions_ref.region_code
    )
  `;
}

async function seedPays(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_pays_ref (Phase 17 D1 — 22 pays v1 Excel)");
  // 22 pays extraits Excel v1 colonne PAYS, mappés sur les 7 régions D2.
  // UPSERT (UPDATE region_code/nom) car les pays peuvent déjà exister depuis
  // un seed antérieur avec un region_code obsolète (ex: SN était AFRIQUE_OUEST,
  // bascule AFRIQUE_FRANCOPHONE).
  await sql`
    INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
      -- NORD_AFRIQUE (5)
      ('MA', 'Maroc',                        'NORD_AFRIQUE'),
      ('DZ', 'Algérie',                      'NORD_AFRIQUE'),
      ('TN', 'Tunisie',                      'NORD_AFRIQUE'),
      ('LY', 'Libye',                        'NORD_AFRIQUE'),
      ('SD', 'Soudan',                       'NORD_AFRIQUE'),
      -- AFRIQUE_FRANCOPHONE (9)
      ('SN', 'Sénégal',                      'AFRIQUE_FRANCOPHONE'),
      ('CI', 'Côte d''Ivoire',               'AFRIQUE_FRANCOPHONE'),
      ('MR', 'Mauritanie',                   'AFRIQUE_FRANCOPHONE'),
      ('CM', 'Cameroun',                     'AFRIQUE_FRANCOPHONE'),
      ('CG', 'Congo',                        'AFRIQUE_FRANCOPHONE'),
      ('GQ', 'Guinée Équatoriale',           'AFRIQUE_FRANCOPHONE'),
      ('NE', 'Niger',                        'AFRIQUE_FRANCOPHONE'),
      ('TG', 'Togo',                         'AFRIQUE_FRANCOPHONE'),
      ('BI', 'Burundi',                      'AFRIQUE_FRANCOPHONE'),
      -- AFRIQUE_ANGLOPHONE (1)
      ('ET', 'Éthiopie',                     'AFRIQUE_ANGLOPHONE'),
      -- ASIE (1)
      ('NP', 'Népal',                        'ASIE'),
      -- MOYEN_ORIENT (4)
      ('JO', 'Jordanie',                     'MOYEN_ORIENT'),
      ('IQ', 'Iraq',                         'MOYEN_ORIENT'),
      ('YE', 'Yémen',                        'MOYEN_ORIENT'),
      ('AE', 'Dubaï (Émirats arabes unis)',  'MOYEN_ORIENT'),
      -- EUROPE (1)
      ('FR', 'France',                       'EUROPE'),
      -- AUSTRALIE (1)
      ('AU', 'Australie',                    'AUSTRALIE')
    ON CONFLICT (code_pays) DO UPDATE
    SET region_code = EXCLUDED.region_code,
        nom = EXCLUDED.nom
  `;

  // Cleanup pays legacy hors v1 — FK-safe (skip si client/entité référence
  // encore le pays). Premier passage post-migration : peut échouer si données
  // démo n'ont pas été purgées via /settings/demo Phase 17 F2.
  await sql`
    DELETE FROM lic_pays_ref
    WHERE code_pays NOT IN (
      'MA','DZ','TN','LY','SD','SN','CI','MR','CM','CG','GQ','NE','TG','BI',
      'ET','NP','JO','IQ','YE','AE','FR','AU'
    )
    AND NOT EXISTS (SELECT 1 FROM lic_clients c WHERE c.code_pays = lic_pays_ref.code_pays)
    AND NOT EXISTS (SELECT 1 FROM lic_entites e WHERE e.code_pays = lic_pays_ref.code_pays)
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
  log.info("Seeding lic_team_members (Phase 17 D2 — 10 membres réalistes)");
  // 10 membres alignés équipe S2M v1 — 4 SALES + 3 AM + 3 DM (1 par région
  // commerciale prioritaire). Pas de UNIQUE constraint en BD → idempotence
  // par WHERE NOT EXISTS sur email. Les region_code des DM sont les nouvelles
  // 7 régions D2 (Phase 17).
  const seeds: readonly {
    nom: string;
    prenom: string;
    email: string;
    roleTeam: "SALES" | "AM" | "DM";
    regionCode: string | null;
  }[] = [
    // SALES (4) — pas de région attribuée
    {
      nom: "BERRADA",
      prenom: "Youssef",
      email: "youssef.berrada@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    {
      nom: "BOUSNIN",
      prenom: "Mounir",
      email: "mounir.bousnin@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    {
      nom: "CHAYBI",
      prenom: "Issam",
      email: "issam.chaybi@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    {
      nom: "KHALIL",
      prenom: "Ahmed",
      email: "ahmed.khalil@s2m.ma",
      roleTeam: "SALES",
      regionCode: null,
    },
    // AM Account Managers (3)
    {
      nom: "HOUSSNI",
      prenom: "Hakim",
      email: "hakim.houssni@s2m.ma",
      roleTeam: "AM",
      regionCode: null,
    },
    {
      nom: "ELISMAILI",
      prenom: "Houssam",
      email: "houssam.elismaili@s2m.ma",
      roleTeam: "AM",
      regionCode: null,
    },
    {
      nom: "MOUJAHID",
      prenom: "Jamal",
      email: "jamal.moujahid@s2m.ma",
      roleTeam: "AM",
      regionCode: null,
    },
    // DM Direction Managers (3) — un par région commerciale prioritaire
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
      regionCode: "AFRIQUE_FRANCOPHONE",
    },
    {
      nom: "AL-FARSI",
      prenom: "Omar",
      email: "omar.alfarsi@s2m.ma",
      roleTeam: "DM",
      regionCode: "MOYEN_ORIENT",
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

    // Phase 17 D5 — 10 notifications démo (5 lues + 5 non-lues).
    // Idempotent : early return si tag DEMO_SEED déjà présent.
    await seedPhase8Notifications(seedClient);

    log.info("Seed completed successfully");
  } finally {
    await seedClient.end();
  }
}

runSeed().catch((err: unknown) => {
  log.error({ err }, "Seed failed");
  process.exit(1);
});
