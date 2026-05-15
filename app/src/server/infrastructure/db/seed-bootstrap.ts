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
// Ordre (Phase 24) :
//   1. lic_regions_ref (7 régions, sans liaison DM) — base FK des pays
//   2. lic_pays_ref (~22 pays, AU rebasculé OCEANIE)
//   3. lic_devises_ref (compléments + bootstrap)
//   4. lic_langues_ref (ar, pt, es)
//   5. lic_types_contact_ref (compléments)
//   6. lic_team_members (8 DM + 9 SALES, sans liaison région)
//   7. lic_users (5 comptes BO)
//   8. lic_settings (10 clés par défaut data-model.md)
//   9. lic_batch_jobs (catalogue jobs batch)
//  10. lic_clients_ref (Phase 24 — référentiel codes clients S2M)
//  11. lic_produits_ref + lic_articles_ref (catalogue SADMIN — bootstrap)
//
// Connexion dédiée max=1 fermée à la fin (cf. migrate.ts).
// ==============================================================================

import "../../../../scripts/load-env";

import bcryptjs from "bcryptjs";
import postgres from "postgres";

// Phase 24 — inlined depuis @s2m-lic/shared/constants/system-user pour
// rompre la dépendance cross-workspace dans les seeds (les images Docker
// de migration n'embarquent pas le workspace shared).
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";
import { seedPhase1ClientsRef } from "./seed/phase1-clients-ref.seed";
import { seedPhase6CatalogueBootstrap } from "./seed/phase6-catalogue.seed";

const log = createChildLogger("db/seed");

// Mot de passe par défaut pour les 5 comptes BO seedés. must_change_password
// est posé à true → forcera le changement au premier login.
// Lecture depuis env.INITIAL_ADMIN_PASSWORD (validé Zod min 12 chars) — fallback
// "ChangeMe-2026!" si non défini, avec warning explicite côté logs.
const DEFAULT_PASSWORD = env.INITIAL_ADMIN_PASSWORD ?? "ChangeMe-2026!";
const BCRYPT_COST = 10;

async function seedSystemUser(sql: postgres.Sql): Promise<void> {
  log.info("Seeding SYS-000 system user (nil UUID — FK target lic_settings.updated_by)");
  // Recrée le compte SYSTEM (id = nil UUID RFC 9562) supprimé par un éventuel
  // TRUNCATE CASCADE des tests/démos. seedSettings référence cet ID en FK
  // (updated_by) → DOIT être appelé EN PREMIER dans runSeed.
  //
  // Valeurs alignées avec la migration 0000 (nom/prenom/email/role/actif).
  // password_hash : bcrypt cost 10 d'un random 64 chars jeté (format valide,
  // bcrypt.compare retourne false proprement). Compte exclu des UI (actif=false).
  await sql`
    INSERT INTO lic_users (
      id, matricule, nom, prenom, email,
      password_hash, role, actif, must_change_password
    ) VALUES (
      ${SYSTEM_USER_ID}::uuid,
      'SYS-000', 'SYSTEM', 'Système', 'system@s2m.local',
      '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
      'SADMIN', false, false
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

async function seedRegions(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_regions_ref (Phase 24 — 8 régions sans liaison DM)");
  // Phase 24 — 8 régions canoniques, indépendantes des DM/Sales (la relation
  // DM ↔ région a été retirée du modèle — un DM peut couvrir n'importe quelle
  // zone). `dm_responsable` reste NULL pour toutes — sera nullifié côté seed
  // démo si déjà setté. AMERIQUE ajoutée pour couvrir US/CA/BR (cf. seedPays).
  await sql`
    INSERT INTO lic_regions_ref (region_code, nom, dm_responsable) VALUES
      ('AFRIQUE_ANGLOPHONE',   'Afrique Anglophone',  NULL),
      ('AFRIQUE_FRANCOPHONE',  'Afrique Francophone', NULL),
      ('NORD_AFRIQUE',         'Afrique du Nord',     NULL),
      ('MOYEN_ORIENT',         'Moyen-Orient',        NULL),
      ('OCEANIE',              'Océanie',             NULL),
      ('ASIE',                 'Asie',                NULL),
      ('EUROPE',               'Europe',              NULL),
      ('AMERIQUE',             'Amérique',            NULL)
    ON CONFLICT (region_code) DO UPDATE
      SET nom = EXCLUDED.nom,
          dm_responsable = NULL
  `;

  // Phase 24 — migration des pays AUSTRALIE → OCEANIE avant suppression de
  // AUSTRALIE (sinon FK casse). Idempotent (no-op si aucun pays AUSTRALIE).
  await sql`
    UPDATE lic_pays_ref SET region_code = 'OCEANIE' WHERE region_code = 'AUSTRALIE'
  `;
  // team_members legacy avec region_code AUSTRALIE/PASS — passe à NULL.
  await sql`
    UPDATE lic_team_members SET region_code = NULL
    WHERE region_code IN ('AUSTRALIE', 'PASS')
  `;

  // Cleanup régions legacy hors set Phase 24 — FK-safe.
  await sql`
    DELETE FROM lic_regions_ref
    WHERE region_code NOT IN (
      'AFRIQUE_ANGLOPHONE', 'AFRIQUE_FRANCOPHONE', 'NORD_AFRIQUE',
      'MOYEN_ORIENT', 'OCEANIE', 'ASIE', 'EUROPE', 'AMERIQUE'
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
  log.info("Seeding lic_pays_ref (autonome — 72 pays périmètre S2M)");
  // Seed autonome et exhaustif (Afrique + Maghreb + Moyen-Orient + Europe +
  // Asie + Océanie + Amérique). Chaque pays est mappé sur sa région Phase 24
  // (8 régions, cf. seedRegions). UPSERT (UPDATE region_code/nom) — les pays
  // peuvent déjà exister depuis un seed antérieur avec un region_code obsolète.
  await sql`
    INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
      -- NORD_AFRIQUE (6)
      ('MA', 'Maroc',                              'NORD_AFRIQUE'),
      ('DZ', 'Algérie',                            'NORD_AFRIQUE'),
      ('TN', 'Tunisie',                            'NORD_AFRIQUE'),
      ('LY', 'Libye',                              'NORD_AFRIQUE'),
      ('SD', 'Soudan',                             'NORD_AFRIQUE'),
      ('EG', 'Égypte',                             'NORD_AFRIQUE'),
      -- AFRIQUE_FRANCOPHONE (18)
      ('SN', 'Sénégal',                            'AFRIQUE_FRANCOPHONE'),
      ('CI', 'Côte d''Ivoire',                     'AFRIQUE_FRANCOPHONE'),
      ('MR', 'Mauritanie',                         'AFRIQUE_FRANCOPHONE'),
      ('CM', 'Cameroun',                           'AFRIQUE_FRANCOPHONE'),
      ('CG', 'Congo',                              'AFRIQUE_FRANCOPHONE'),
      ('CD', 'République démocratique du Congo',   'AFRIQUE_FRANCOPHONE'),
      ('GQ', 'Guinée Équatoriale',                 'AFRIQUE_FRANCOPHONE'),
      ('NE', 'Niger',                              'AFRIQUE_FRANCOPHONE'),
      ('TG', 'Togo',                               'AFRIQUE_FRANCOPHONE'),
      ('BI', 'Burundi',                            'AFRIQUE_FRANCOPHONE'),
      ('ML', 'Mali',                               'AFRIQUE_FRANCOPHONE'),
      ('BF', 'Burkina Faso',                       'AFRIQUE_FRANCOPHONE'),
      ('BJ', 'Bénin',                              'AFRIQUE_FRANCOPHONE'),
      ('GA', 'Gabon',                              'AFRIQUE_FRANCOPHONE'),
      ('TD', 'Tchad',                              'AFRIQUE_FRANCOPHONE'),
      ('MG', 'Madagascar',                         'AFRIQUE_FRANCOPHONE'),
      ('RW', 'Rwanda',                             'AFRIQUE_FRANCOPHONE'),
      ('DJ', 'Djibouti',                           'AFRIQUE_FRANCOPHONE'),
      -- AFRIQUE_ANGLOPHONE (10)
      ('ET', 'Éthiopie',                           'AFRIQUE_ANGLOPHONE'),
      ('KE', 'Kenya',                              'AFRIQUE_ANGLOPHONE'),
      ('NG', 'Nigeria',                            'AFRIQUE_ANGLOPHONE'),
      ('GH', 'Ghana',                              'AFRIQUE_ANGLOPHONE'),
      ('ZA', 'Afrique du Sud',                     'AFRIQUE_ANGLOPHONE'),
      ('UG', 'Ouganda',                            'AFRIQUE_ANGLOPHONE'),
      ('TZ', 'Tanzanie',                           'AFRIQUE_ANGLOPHONE'),
      ('ZM', 'Zambie',                             'AFRIQUE_ANGLOPHONE'),
      ('ZW', 'Zimbabwe',                           'AFRIQUE_ANGLOPHONE'),
      ('MU', 'Maurice',                            'AFRIQUE_ANGLOPHONE'),
      -- MOYEN_ORIENT (12)
      ('JO', 'Jordanie',                           'MOYEN_ORIENT'),
      ('IQ', 'Iraq',                               'MOYEN_ORIENT'),
      ('YE', 'Yémen',                              'MOYEN_ORIENT'),
      ('AE', 'Émirats arabes unis',                'MOYEN_ORIENT'),
      ('SA', 'Arabie saoudite',                    'MOYEN_ORIENT'),
      ('QA', 'Qatar',                              'MOYEN_ORIENT'),
      ('KW', 'Koweït',                             'MOYEN_ORIENT'),
      ('BH', 'Bahreïn',                            'MOYEN_ORIENT'),
      ('OM', 'Oman',                               'MOYEN_ORIENT'),
      ('LB', 'Liban',                              'MOYEN_ORIENT'),
      ('SY', 'Syrie',                              'MOYEN_ORIENT'),
      ('PS', 'Palestine',                          'MOYEN_ORIENT'),
      -- ASIE (11)
      ('NP', 'Népal',                              'ASIE'),
      ('IN', 'Inde',                               'ASIE'),
      ('CN', 'Chine',                              'ASIE'),
      ('JP', 'Japon',                              'ASIE'),
      ('KR', 'Corée du Sud',                       'ASIE'),
      ('SG', 'Singapour',                          'ASIE'),
      ('MY', 'Malaisie',                           'ASIE'),
      ('TH', 'Thaïlande',                          'ASIE'),
      ('ID', 'Indonésie',                          'ASIE'),
      ('PK', 'Pakistan',                           'ASIE'),
      ('BD', 'Bangladesh',                         'ASIE'),
      -- EUROPE (10)
      ('FR', 'France',                             'EUROPE'),
      ('ES', 'Espagne',                            'EUROPE'),
      ('IT', 'Italie',                             'EUROPE'),
      ('DE', 'Allemagne',                          'EUROPE'),
      ('GB', 'Royaume-Uni',                        'EUROPE'),
      ('BE', 'Belgique',                           'EUROPE'),
      ('NL', 'Pays-Bas',                           'EUROPE'),
      ('CH', 'Suisse',                             'EUROPE'),
      ('PT', 'Portugal',                           'EUROPE'),
      ('LU', 'Luxembourg',                         'EUROPE'),
      -- OCEANIE (2)
      ('AU', 'Australie',                          'OCEANIE'),
      ('NZ', 'Nouvelle-Zélande',                   'OCEANIE'),
      -- AMERIQUE (3)
      ('US', 'États-Unis',                         'AMERIQUE'),
      ('CA', 'Canada',                             'AMERIQUE'),
      ('BR', 'Brésil',                             'AMERIQUE')
    ON CONFLICT (code_pays) DO UPDATE
    SET region_code = EXCLUDED.region_code,
        nom = EXCLUDED.nom
  `;

  // Cleanup pays legacy hors liste exhaustive Phase 24 — FK-safe (skip si
  // client/entité référence encore le pays). Premier passage post-migration :
  // peut échouer si données démo n'ont pas été purgées via /settings/demo.
  await sql`
    DELETE FROM lic_pays_ref
    WHERE code_pays NOT IN (
      -- NORD_AFRIQUE
      'MA','DZ','TN','LY','SD','EG',
      -- AFRIQUE_FRANCOPHONE
      'SN','CI','MR','CM','CG','CD','GQ','NE','TG','BI',
      'ML','BF','BJ','GA','TD','MG','RW','DJ',
      -- AFRIQUE_ANGLOPHONE
      'ET','KE','NG','GH','ZA','UG','TZ','ZM','ZW','MU',
      -- MOYEN_ORIENT
      'JO','IQ','YE','AE','SA','QA','KW','BH','OM','LB','SY','PS',
      -- ASIE
      'NP','IN','CN','JP','KR','SG','MY','TH','ID','PK','BD',
      -- EUROPE
      'FR','ES','IT','DE','GB','BE','NL','CH','PT','LU',
      -- OCEANIE
      'AU','NZ',
      -- AMERIQUE
      'US','CA','BR'
    )
    AND NOT EXISTS (SELECT 1 FROM lic_clients c WHERE c.code_pays = lic_pays_ref.code_pays)
    AND NOT EXISTS (SELECT 1 FROM lic_entites e WHERE e.code_pays = lic_pays_ref.code_pays)
  `;
}

async function seedDevises(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_devises_ref (autonome — 32 devises ISO 4217 périmètre S2M)");
  // Seed autonome et exhaustif. Couvre toutes les devises utiles pour le
  // périmètre S2M : Afrique + Maghreb + Moyen-Orient + Europe + Asie +
  // Océanie + Amérique. Ne dépend plus du bootstrap migration 0003 (qui
  // restera idempotent grâce à ON CONFLICT DO NOTHING).
  await sql`
    INSERT INTO lic_devises_ref (code_devise, nom, symbole) VALUES
      -- Devises principales
      ('MAD', 'Dirham marocain',       'DH'),
      ('EUR', 'Euro',                  '€'),
      ('USD', 'Dollar américain',      '$'),
      ('GBP', 'Livre sterling',        '£'),
      ('CHF', 'Franc suisse',          'CHF'),
      -- Afrique francophone (zones CFA)
      ('XOF', 'Franc CFA BCEAO',       'CFA'),
      ('XAF', 'Franc CFA BEAC',        'FCFA'),
      -- Maghreb + Afrique du Nord
      ('TND', 'Dinar tunisien',        'DT'),
      ('DZD', 'Dinar algérien',        'DA'),
      ('LYD', 'Dinar libyen',          'LD'),
      ('EGP', 'Livre égyptienne',      'E£'),
      ('SDG', 'Livre soudanaise',      'SDG'),
      ('MRU', 'Ouguiya mauritanienne', 'UM'),
      -- Afrique anglophone / Océan Indien
      ('GHS', 'Cedi ghanéen',          'GH₵'),
      ('NGN', 'Naira nigérian',        '₦'),
      ('KES', 'Shilling kényan',       'KSh'),
      ('ETB', 'Birr éthiopien',        'Br'),
      ('ZAR', 'Rand sud-africain',     'R'),
      ('MUR', 'Roupie mauricienne',    '₨'),
      ('MGA', 'Ariary malgache',       'Ar'),
      -- Moyen-Orient
      ('AED', 'Dirham émirati',        'AED'),
      ('SAR', 'Riyal saoudien',        'SAR'),
      ('QAR', 'Riyal qatari',          'QAR'),
      ('JOD', 'Dinar jordanien',       'JD'),
      ('IQD', 'Dinar irakien',         'IQD'),
      ('YER', 'Riyal yéménite',        'YER'),
      -- Asie / Océanie / Amérique
      ('NPR', 'Roupie népalaise',      'NPR'),
      ('AUD', 'Dollar australien',     'A$'),
      ('CAD', 'Dollar canadien',       'C$'),
      ('CNY', 'Yuan chinois',          '¥'),
      ('JPY', 'Yen japonais',          '¥'),
      ('INR', 'Roupie indienne',       '₹')
    ON CONFLICT (code_devise) DO NOTHING
  `;
}

async function seedLangues(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_langues_ref (autonome — 7 langues utiles)");
  // Seed autonome et exhaustif. Ne dépend plus du bootstrap migration 0003.
  await sql`
    INSERT INTO lic_langues_ref (code_langue, nom) VALUES
      ('fr', 'Français'),
      ('en', 'English'),
      ('ar', 'العربية'),
      ('pt', 'Português'),
      ('es', 'Español'),
      ('de', 'Deutsch'),
      ('it', 'Italiano')
    ON CONFLICT (code_langue) DO NOTHING
  `;
}

async function seedTypesContact(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_types_contact_ref (autonome — 9 types métier S2M)");
  // Seed autonome et exhaustif. Ne dépend plus du bootstrap migration 0003.
  await sql`
    INSERT INTO lic_types_contact_ref (code, libelle) VALUES
      ('ACHAT',        'Achat'),
      ('FACTURATION',  'Facturation'),
      ('TECHNIQUE',    'Technique'),
      ('TECHNIQUE_F2', 'Technique F2 (intégration)'),
      ('JURIDIQUE',    'Juridique'),
      ('DIRECTION',    'Direction'),
      ('COMMERCIAL',   'Commercial'),
      ('SUPPORT',      'Support'),
      ('RH',           'Ressources humaines')
    ON CONFLICT (code) DO NOTHING
  `;
}

async function seedTeamMembers(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_team_members (Phase 24 — 8 DM + 9 SALES, sans liaison région)");
  // Phase 24 — refonte de l'équipe : 8 DM + 9 SALES, plus de rôle AM, plus
  // de liaison DM ↔ région. Les anciens emails fictifs (HOUSSNI/ELISMAILI/
  // MOUJAHID en AM, ZAOUI/DIALLO/AL-FARSI en DM, et les anciens SALES avec
  // pattern `prenom.nom@s2m.ma`) sont supprimés FK-safe (clients.account_
  // manager / sales_responsable sont varchar libres, pas FK contraignante).
  const seeds: readonly {
    nom: string;
    prenom: string;
    email: string;
    roleTeam: "SALES" | "DM";
  }[] = [
    // DM Direction Managers (8) — region_code = NULL pour tous
    { nom: "BOUDERBA", prenom: "Mounir", email: "mbouderba@s2m.ma", roleTeam: "DM" },
    { nom: "BEN NASSEF", prenom: "Noureddine", email: "nbennassef@s2m.ma", roleTeam: "DM" },
    { nom: "FAHMI", prenom: "Ghassane", email: "gfahmi@s2m.ma", roleTeam: "DM" },
    { nom: "EL KASMI", prenom: "Hicham", email: "helkasmi@s2m.ma", roleTeam: "DM" },
    { nom: "MOUJAHID", prenom: "Jamal", email: "jmoujahid@s2m.ma", roleTeam: "DM" },
    { nom: "HASNI", prenom: "Hakim", email: "hhasni@s2m.ma", roleTeam: "DM" },
    { nom: "EL ISMAILI", prenom: "Houssam", email: "helismaili@s2m.ma", roleTeam: "DM" },
    { nom: "HANDIR", prenom: "Omar", email: "ohandir@s2m.ma", roleTeam: "DM" },
    // SALES (9) — region_code = NULL pour tous
    { nom: "BERRADA", prenom: "Youssef", email: "yberrada@s2m.ma", roleTeam: "SALES" },
    { nom: "BOUSNIN", prenom: "Mounir", email: "mbousnin@s2m.ma", roleTeam: "SALES" },
    { nom: "CHAYBI", prenom: "Issam", email: "ichaybi@s2m.ma", roleTeam: "SALES" },
    { nom: "KHALIL", prenom: "Ahmed", email: "akhalil@s2m.ma", roleTeam: "SALES" },
    { nom: "CHAHMAT", prenom: "Hanane", email: "hchahmat@s2m.ma", roleTeam: "SALES" },
    { nom: "BENNINE", prenom: "Kamilia", email: "kbennine@s2m.ma", roleTeam: "SALES" },
    { nom: "AMARTI RIFFI", prenom: "Mohammed", email: "mamartiriffi@s2m.ma", roleTeam: "SALES" },
    { nom: "EL BOUZIDI", prenom: "Fatima Zahra", email: "fzelbouzidi@s2m.ma", roleTeam: "SALES" },
    { nom: "BNANA ADAN", prenom: "Mohamed", email: "abnana@s2m.ma", roleTeam: "SALES" },
  ];

  for (const m of seeds) {
    await sql`
      INSERT INTO lic_team_members (nom, prenom, email, role_team, region_code)
      SELECT ${m.nom}, ${m.prenom}, ${m.email}, ${m.roleTeam}, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM lic_team_members WHERE email = ${m.email}
      )
    `;
  }

  // Phase 24 — cleanup des anciens emails fictifs (HOUSSNI/ELISMAILI/MOUJAHID
  // en AM avec point ; SALES anciens avec pattern prenom.nom@s2m.ma ; DM
  // fictifs ZAOUI/DIALLO/AL-FARSI). Liste explicite — pas de DELETE par rôle
  // pour ne pas casser un team_member ajouté manuellement par un SADMIN.
  const legacyEmails = [
    "youssef.berrada@s2m.ma",
    "mounir.bousnin@s2m.ma",
    "issam.chaybi@s2m.ma",
    "ahmed.khalil@s2m.ma",
    "hakim.houssni@s2m.ma",
    "houssam.elismaili@s2m.ma",
    "jamal.moujahid@s2m.ma",
    "karim.zaoui@s2m.ma",
    "aminata.diallo@s2m.ma",
    "omar.alfarsi@s2m.ma",
  ];
  await sql`
    DELETE FROM lic_team_members WHERE email = ANY(${legacyEmails})
  `;

  // Phase 24 — région forcée à NULL sur tous les membres restants (le rôle
  // DM n'est plus lié à une zone). Idempotent.
  await sql`UPDATE lic_team_members SET region_code = NULL WHERE region_code IS NOT NULL`;
}

async function seedUsers(sql: postgres.Sql): Promise<void> {
  log.info("Seeding lic_users");
  if (env.INITIAL_ADMIN_PASSWORD === undefined) {
    log.warn(
      "INITIAL_ADMIN_PASSWORD non défini — mot de passe par défaut utilisé (ChangeMe-2026!)",
    );
  }
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
    // ON CONFLICT (matricule) DO UPDATE : si le compte existe déjà avec un
    // lockout actif (failed_login_count > 0 + last_failed_login_at), on remet
    // à zéro pour que le seed soit ré-exécutable sans intervention manuelle.
    // Ne touche pas password_hash / role / nom / etc. (intentionnel — préserve
    // les modifs faites par un SADMIN sur l'environnement local).
    await sql`
      INSERT INTO lic_users (
        matricule, nom, prenom, email, password_hash,
        must_change_password, role, actif
      ) VALUES (
        ${u.matricule}, ${u.nom}, ${u.prenom}, ${u.email}, ${passwordHash},
        true, ${u.role}, true
      )
      ON CONFLICT (matricule) DO UPDATE SET
        failed_login_count = 0,
        last_failed_login_at = NULL,
        actif = true
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
    // Ordre strict : SYS-000 EN PREMIER (FK target updated_by côté lic_settings
    // après TRUNCATE CASCADE), puis régions avant pays (FK), users avant settings
    // (FK updated_by), bootstrap avant compléments (déjà inséré par migration 0003).
    await seedSystemUser(seedClient);
    await seedRegions(seedClient);
    await seedPays(seedClient);
    await seedDevises(seedClient);
    await seedLangues(seedClient);
    await seedTypesContact(seedClient);
    await seedTeamMembers(seedClient);
    await seedUsers(seedClient);
    await seedSettings(seedClient);
    // Phase 8.A — catalogue jobs batch (idempotent).
    await seedBatchJobsCatalog(seedClient);
    // Phase 24 — référentiel des codes clients S2M (lecture seule UI,
    // autocomplétion à la création client). Idempotent ON CONFLICT.
    await seedPhase1ClientsRef(seedClient);
    // Phase 24 — catalogue produits + articles (référentiels SADMIN
    // préservés par purge-demo). Les liaisons licence↔articles + volume
    // history restent côté seed démo (phase6-catalogue.seed).
    await seedPhase6CatalogueBootstrap(seedClient);

    log.info("Seed completed successfully");
  } finally {
    await seedClient.end();
  }
}

runSeed().catch((err: unknown) => {
  log.error({ err }, "Seed failed");
  process.exit(1);
});
