-- ============================================================================
-- LIC_PORTAL — Données de démonstration PostgreSQL
-- Version : 2.0 — Sprint 10, Lot A5 (DEC-016)
-- ============================================================================
--
-- 55 clients réels SELECT-PX, catalogue commercial Produits/Articles
-- (DEC-013/DEC-014/DEC-015). Sprint 10 — Lot 13 (DEC-022) : les anciennes
-- tables `lic_modules`, `lic_volumes`, `lic_volume_history` (et leurs
-- catalogues techniques) ont été définitivement supprimées du schéma.
--
-- Idempotent : exécution multiple sans erreur (TRUNCATE + INSERT + ON CONFLICT
-- pour les catalogues).
--
-- Usage :
--   psql -U lic_portal -d lic_portal -f demo-data.sql
--   ou via : pnpm db:reset
-- ============================================================================

BEGIN;

-- ============================================================================
-- TRUNCATE — repartir d'un état propre (tables métier + transactionnelles)
-- ============================================================================
-- Note : les catalogues paramétrables (regions_ref, pays_ref, devises_ref,
-- langues_ref, types_contact_ref, team_members) et le catalogue commercial
-- (produits_ref, articles_ref) sont également tronqués en amont par
-- `seed.ts --reset`. Les inserts ci-dessous les ré-alimentent avec
-- ON CONFLICT DO NOTHING pour garantir l'idempotence en re-run direct (psql).

TRUNCATE TABLE
  lic_audit_log,
  lic_notifications,
  lic_batch_logs,
  lic_batch_executions,
  lic_alert_config,
  lic_renouvellement,
  lic_article_volume_history,
  lic_licence_articles,
  lic_licence_produits,
  lic_licences,
  lic_entites,
  lic_clients,
  lic_users
RESTART IDENTITY CASCADE;

-- ============================================================================
-- 1. RÉFÉRENTIELS PARAMÉTRABLES (Lot A1, DEC-012)
-- ============================================================================

INSERT INTO lic_regions_ref (region_code, nom, dm_responsable) VALUES
  ('NORD_AFRIQUE',  'Nord Afrique',          'DM Nord Afrique'),
  ('AFRIQUE_FR',    'Afrique Francophone',   'DM Afrique Francophone'),
  ('AFRIQUE_EN',    'Afrique Anglophone',    'DM Afrique Anglophone'),
  ('ASIE',          'Asie',                  'DM Asie'),
  ('MOYEN_ORIENT',  'Moyen Orient',          'DM Moyen Orient'),
  ('EUROPE',        'Europe',                'DM Europe'),
  ('AUSTRALIE',     'Australie',             'DM Australie')
ON CONFLICT (region_code) DO NOTHING;

INSERT INTO lic_pays_ref (code_pays, nom, region_code) VALUES
  ('MA', 'Maroc',                  'NORD_AFRIQUE'),
  ('TN', 'Tunisie',                'NORD_AFRIQUE'),
  ('LY', 'Libye',                  'NORD_AFRIQUE'),
  ('SD', 'Soudan',                 'NORD_AFRIQUE'),
  ('DZ', 'Algérie',                'NORD_AFRIQUE'),
  ('MR', 'Mauritanie',             'AFRIQUE_FR'),
  ('SN', 'Sénégal',                'AFRIQUE_FR'),
  ('CI', 'Côte d''Ivoire',         'AFRIQUE_FR'),
  ('CM', 'Cameroun',               'AFRIQUE_FR'),
  ('TG', 'Togo',                   'AFRIQUE_FR'),
  ('NE', 'Niger',                  'AFRIQUE_FR'),
  ('CG', 'Congo',                  'AFRIQUE_FR'),
  ('GQ', 'Guinée Équatoriale',     'AFRIQUE_FR'),
  ('BI', 'Burundi',                'AFRIQUE_FR'),
  ('ET', 'Éthiopie',               'AFRIQUE_EN'),
  ('NP', 'Népal',                  'ASIE'),
  ('JO', 'Jordanie',               'MOYEN_ORIENT'),
  ('IQ', 'Iraq',                   'MOYEN_ORIENT'),
  ('YE', 'Yémen',                  'MOYEN_ORIENT'),
  ('AE', 'Émirats Arabes Unis',    'MOYEN_ORIENT'),
  ('FR', 'France',                 'EUROPE'),
  ('AU', 'Australie',              'AUSTRALIE'),
  ('ZM', 'Zambie',                 'AFRIQUE_EN')
ON CONFLICT (code_pays) DO NOTHING;

INSERT INTO lic_devises_ref (code_devise, nom, symbole) VALUES
  ('MAD', 'Dirham marocain',       'DH'),
  ('TND', 'Dinar tunisien',        'DT'),
  ('XOF', 'Franc CFA Ouest',       'CFA'),
  ('XAF', 'Franc CFA Centre',      'CFA'),
  ('USD', 'Dollar US',             '$'),
  ('EUR', 'Euro',                  '€'),
  ('AED', 'Dirham EAU',            'AED'),
  ('JOD', 'Dinar jordanien',       'JD'),
  ('IQD', 'Dinar irakien',         'IQD'),
  ('YER', 'Rial yéménite',         'YR'),
  ('ETB', 'Birr éthiopien',        'Br'),
  ('NPR', 'Roupie népalaise',      'Rs'),
  ('AUD', 'Dollar australien',     'A$'),
  ('LYD', 'Dinar libyen',          'LD'),
  ('DZD', 'Dinar algérien',        'DA'),
  ('SDG', 'Livre soudanaise',      'SDG'),
  ('ZMW', 'Kwacha zambien',        'K'),
  ('MRU', 'Ouguiya mauritanien',   'UM')
ON CONFLICT (code_devise) DO NOTHING;

INSERT INTO lic_langues_ref (code_langue, nom) VALUES
  ('fr', 'Français'),
  ('en', 'Anglais'),
  ('ar', 'Arabe'),
  ('es', 'Espagnol')
ON CONFLICT (code_langue) DO NOTHING;

INSERT INTO lic_types_contact_ref (code, libelle) VALUES
  ('ACHAT',       'Service Achats'),
  ('FACTURATION', 'Service Facturation'),
  ('RESPONSABLE', 'Responsable Compte'),
  ('TECHNIQUE',   'Contact Technique'),
  ('COMMERCIAL',  'Contact Commercial')
ON CONFLICT (code) DO NOTHING;

INSERT INTO lic_team_members (nom, prenom, role_team, region_code) VALUES
  ('BOUSNIN',     'Mounir',   'SALES', NULL),
  ('BERRADA',     'Youssef',  'SALES', NULL),
  ('KHALIL',      'Ahmed',    'SALES', NULL),
  ('CHAYBI',      'Issam',    'SALES', NULL),
  ('HOUSSNI',     'Hakim',    'AM',    NULL),
  ('ELISMAILI',   'Houssam',  'AM',    NULL),
  ('BOUDERBA',    'Mounir',   'AM',    NULL),
  ('FAHMI',       'Ghassan',  'AM',    NULL),
  ('MOUJAHID',    'Jamal',    'AM',    NULL),
  ('HANDI',       'Omar',     'AM',    NULL),
  ('BENASSEF',    'Nourddine','AM',    NULL),
  ('DM Nord Afrique',          NULL, 'DM', 'NORD_AFRIQUE'),
  ('DM Afrique Francophone',   NULL, 'DM', 'AFRIQUE_FR'),
  ('DM Afrique Anglophone',    NULL, 'DM', 'AFRIQUE_EN'),
  ('DM Asie',                  NULL, 'DM', 'ASIE'),
  ('DM Moyen Orient',          NULL, 'DM', 'MOYEN_ORIENT'),
  ('DM Europe',                NULL, 'DM', 'EUROPE'),
  ('DM Australie',             NULL, 'DM', 'AUSTRALIE')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. CATALOGUE COMMERCIAL — Produits + Articles (Lot A2, DEC-013)
-- ============================================================================

INSERT INTO lic_produits_ref (produit_code, libelle, ordre_affichage) VALUES
  ('SPX_CORE',        'SelectPX Core',                       10),
  ('SPX_SWITCHING',   'SelectPX Switching Suite',            20),
  ('SPX_ACQUIRING',   'SelectPX Acquiring Suite',            30),
  ('SPX_ISSUING',     'SelectPX Issuing Suite',              40),
  ('SOFTPOS',         'SoftPOS',                             50),
  ('DIGITAL_HUB',     'Digital & Instant Payment Hub',       60),
  ('INSTANT_CLIENT',  'Instant Payment Client',              70),
  ('WALLET',          'Wallet Management System',            80),
  ('CARD_DIGIT',      'Card Digitization',                   90),
  ('TOKENISATION',    'Tokenisation',                       100),
  ('EBPP',            'EBPP - Electronic Bill Payment',     110),
  ('POS_APP',         'POS Application',                    120),
  ('ECOM_GW',         'E-commerce Gateway',                 130),
  ('BNPL_ACQ',        'BNPL Acquirer',                      140),
  ('BNPL_ISS',        'BNPL Issuer',                        150),
  ('SSV6_CORE',       'SelectSystem V6 Core',               200),
  ('SSV6_SWITCHING',  'SelectSystem V6 Switching Suite',    210),
  ('SSV6_ACQUIRING',  'SelectSystem V6 Acquiring Suite',    220),
  ('SSV6_ISSUING',    'SelectSystem V6 Issuing Suite',      230)
ON CONFLICT (produit_code) DO NOTHING;

-- Articles AVEC volume (a_volume = true)
INSERT INTO lic_articles_ref (article_code, produit_code, libelle, a_volume, unite_label) VALUES
  ('ATM_STD_SPX',          'SPX_ACQUIRING',  'ATM Management (standard)',                 true, 'Nombre de GAB'),
  ('ATM_AV_SPX',           'SPX_ACQUIRING',  'ATM Management (Added Value)',              true, 'Nombre de GAB'),
  ('POS_STD_SPX',          'SPX_ACQUIRING',  'POS Server (standard)',                     true, 'Nombre de terminaux POS/TPE'),
  ('POS_AV_SPX',           'SPX_ACQUIRING',  'POS Server (Added Value)',                  true, 'Nombre de terminaux POS/TPE'),
  ('SMART_PAY_STD_SPX',    'SPX_ACQUIRING',  'Smart Payment Application (Standard)',      true, 'Nombre d''applications'),
  ('SMART_PAY_AV_SPX',     'SPX_ACQUIRING',  'Smart Payment Application (Added Value)',   true, 'Nombre d''applications'),
  ('MERCHANT_PORTAL_SPX',  'SPX_ACQUIRING',  'Merchant Portal',                           true, 'Nombre de marchands'),
  ('AGENT_PORTAL_SPX',     'SPX_ACQUIRING',  'Agent Portal',                              true, 'Nombre d''agents'),
  ('ATM_STD_V6',           'SSV6_ACQUIRING', 'ATM Management (standard)',                 true, 'Nombre de GAB'),
  ('ATM_AV_V6',            'SSV6_ACQUIRING', 'ATM Management (Added Value)',              true, 'Nombre de GAB'),
  ('POS_STD_V6',           'SSV6_ACQUIRING', 'POS Server (standard)',                     true, 'Nombre de terminaux POS/TPE'),
  ('POS_AV_V6',            'SSV6_ACQUIRING', 'POS Server (Added Value)',                  true, 'Nombre de terminaux POS/TPE'),
  ('SMART_PAY_STD_V6',     'SSV6_ACQUIRING', 'Smart Payment Application (Standard)',      true, 'Nombre d''applications'),
  ('SMART_PAY_AV_V6',      'SSV6_ACQUIRING', 'Smart Payment Application (Added Value)',   true, 'Nombre d''applications'),
  ('MERCHANT_PORTAL_V6',   'SSV6_ACQUIRING', 'Merchant Portal',                           true, 'Nombre de marchands'),
  ('AGENT_PORTAL_V6',      'SSV6_ACQUIRING', 'Agent Portal',                              true, 'Nombre d''agents'),
  ('ISS_INSTITUTION_SPX',  'SPX_ISSUING',    'Institution Management (Issuing)',          true, 'Nombre de porteurs'),
  ('DEBIT_CARD_SPX',       'SPX_ISSUING',    'Debit card management',                     true, 'Nombre de cartes débit'),
  ('CREDIT_CARD_SPX',      'SPX_ISSUING',    'Credit card management',                    true, 'Nombre de cartes crédit'),
  ('PREPAID_CARD_SPX',     'SPX_ISSUING',    'Prepaid card management',                   true, 'Nombre de cartes prépayées'),
  ('ISLAMIC_CARD_SPX',     'SPX_ISSUING',    'Islamic card management',                   true, 'Nombre de cartes islamiques'),
  ('ISS_INSTITUTION_V6',   'SSV6_ISSUING',   'Institution Management (Issuing)',          true, 'Nombre de porteurs'),
  ('DEBIT_CARD_V6',        'SSV6_ISSUING',   'Debit card management',                     true, 'Nombre de cartes débit'),
  ('CREDIT_CARD_V6',       'SSV6_ISSUING',   'Credit card management',                    true, 'Nombre de cartes crédit'),
  ('PREPAID_CARD_V6',      'SSV6_ISSUING',   'Prepaid card management',                   true, 'Nombre de cartes prépayées'),
  ('ISLAMIC_CARD_V6',      'SSV6_ISSUING',   'Islamic card management',                   true, 'Nombre de cartes islamiques'),
  ('SOFTPOS_TERM',         'SOFTPOS',        'SoftPOS Terminal',                          true, 'Nombre de terminaux SoftPOS'),
  ('WALLET_AGENT',         'WALLET',         'Wallet Agent Management',                   true, 'Nombre de wallets agents'),
  ('WALLET_CUSTOMER',      'WALLET',         'Wallet Customer Management',                true, 'Nombre de wallets clients'),
  ('POS_APPLICATION',      'POS_APP',        'POS Application',                           true, 'Nombre de terminaux POS')
ON CONFLICT (article_code) DO NOTHING;

-- Articles SANS volume (a_volume = false)
INSERT INTO lic_articles_ref (article_code, produit_code, libelle, a_volume, unite_label) VALUES
  ('KERNEL_SPX',           'SPX_CORE',       'Kernel',                                    false, NULL),
  ('KERNEL_V6',            'SSV6_CORE',      'Kernel',                                    false, NULL),
  ('SWITCH_INST_SPX',      'SPX_SWITCHING',  'Institution Management (Switching)',        false, NULL),
  ('SWITCH_INST_V6',       'SSV6_SWITCHING', 'Institution Management (Switching)',        false, NULL),
  ('ACQ_INST_SPX',         'SPX_ACQUIRING',  'Institution Management (Acquiring)',        false, NULL),
  ('ECOM_INTEGRE_SPX',     'SPX_ACQUIRING',  'Ecom Server (solution intégrée)',           false, NULL),
  ('ECOM_INTEGRE_AV_SPX',  'SPX_ACQUIRING',  'Ecom Server (solution intégrée) Added Value', false, NULL),
  ('ECOM_STANDLOAN_SPX',   'SPX_ACQUIRING',  'Ecom Server (stand alone)',                 false, NULL),
  ('E_PAYMENT_GW_SPX',     'SPX_ACQUIRING',  'E-Payment Gateway',                         false, NULL),
  ('TDS_SERVER_SPX',       'SPX_ACQUIRING',  '3DS Server',                                false, NULL),
  ('VISA_POS_ACQ_SPX',     'SPX_ACQUIRING',  'Visa POS acquiring',                        false, NULL),
  ('VISA_ATM_ACQ_SPX',     'SPX_ACQUIRING',  'Visa ATM acquiring',                        false, NULL),
  ('VISA_ECOM_ACQ_SPX',    'SPX_ACQUIRING',  'VISA ecom acquiring',                       false, NULL),
  ('MC_POS_ACQ_SPX',       'SPX_ACQUIRING',  'Mastercard POS acquiring',                  false, NULL),
  ('MC_ATM_ACQ_SPX',       'SPX_ACQUIRING',  'Mastercard ATM acquiring',                  false, NULL),
  ('MC_ECOM_ACQ_SPX',      'SPX_ACQUIRING',  'Mastercard ecom acquiring',                 false, NULL),
  ('UPI_POS_ACQ_SPX',      'SPX_ACQUIRING',  'UPI POS acquiring',                         false, NULL),
  ('UPI_ATM_ACQ_SPX',      'SPX_ACQUIRING',  'UPI ATM acquiring',                         false, NULL),
  ('DCI_ACQ_SPX',          'SPX_ACQUIRING',  'DCI acquiring',                             false, NULL),
  ('AMEX_ACQ_SPX',         'SPX_ACQUIRING',  'AMEX acquiring',                            false, NULL),
  ('JCB_ACQ_SPX',          'SPX_ACQUIRING',  'JCB acquiring',                             false, NULL),
  ('LOCAL_ACQ_SPX',        'SPX_ACQUIRING',  'Local/National regional scheme Acquiring',  false, NULL),
  ('ACQ_INST_V6',          'SSV6_ACQUIRING', 'Institution Management (Acquiring)',        false, NULL),
  ('ECOM_SERVER_V6',       'SSV6_ACQUIRING', 'Ecom Server',                               false, NULL),
  ('VISA_POS_ACQ_V6',      'SSV6_ACQUIRING', 'Visa POS acquiring',                        false, NULL),
  ('VISA_ATM_ACQ_V6',      'SSV6_ACQUIRING', 'Visa ATM acquiring',                        false, NULL),
  ('VISA_ECOM_ACQ_V6',     'SSV6_ACQUIRING', 'VISA ecom acquiring',                       false, NULL),
  ('MC_POS_ACQ_V6',        'SSV6_ACQUIRING', 'Mastercard POS acquiring',                  false, NULL),
  ('MC_ATM_ACQ_V6',        'SSV6_ACQUIRING', 'Mastercard ATM acquiring',                  false, NULL),
  ('MC_ECOM_ACQ_V6',       'SSV6_ACQUIRING', 'Mastercard ecom acquiring',                 false, NULL),
  ('UPI_POS_ACQ_V6',       'SSV6_ACQUIRING', 'UPI POS acquiring',                         false, NULL),
  ('UPI_ATM_ACQ_V6',       'SSV6_ACQUIRING', 'UPI ATM acquiring',                         false, NULL),
  ('DCI_ACQ_V6',           'SSV6_ACQUIRING', 'DCI acquiring',                             false, NULL),
  ('AMEX_ACQ_V6',          'SSV6_ACQUIRING', 'AMEX acquiring',                            false, NULL),
  ('JCB_ACQ_V6',           'SSV6_ACQUIRING', 'JCB acquiring',                             false, NULL),
  ('LOCAL_ACQ_V6',         'SSV6_ACQUIRING', 'Local/National regional scheme Acquiring',  false, NULL),
  ('ISS_ACS_SPX',          'SPX_ISSUING',    'ACS',                                       false, NULL),
  ('ISS_BONUS_SPX',        'SPX_ISSUING',    'Bonus Point',                               false, NULL),
  ('VISA_ISS_SPX',         'SPX_ISSUING',    'Visa Issuing',                              false, NULL),
  ('MC_ISS_SPX',           'SPX_ISSUING',    'Mastercard Issuing',                        false, NULL),
  ('UPI_ISS_SPX',          'SPX_ISSUING',    'UPI Issuing',                               false, NULL),
  ('DCI_ISS_SPX',          'SPX_ISSUING',    'DCI Issuing',                               false, NULL),
  ('AMEX_ISS_SPX',         'SPX_ISSUING',    'AMEX Issuing',                              false, NULL),
  ('LOCAL_ISS_SPX',        'SPX_ISSUING',    'Local/National regional scheme Issuing',    false, NULL),
  ('ISS_BONUS_V6',         'SSV6_ISSUING',   'Bonus Point',                               false, NULL),
  ('VISA_ISS_V6',          'SSV6_ISSUING',   'Visa Issuing',                              false, NULL),
  ('MC_ISS_V6',            'SSV6_ISSUING',   'Mastercard Issuing',                        false, NULL),
  ('UPI_ISS_V6',           'SSV6_ISSUING',   'UPI Issuing',                               false, NULL),
  ('DCI_ISS_V6',           'SSV6_ISSUING',   'DCI Issuing',                               false, NULL),
  ('AMEX_ISS_V6',          'SSV6_ISSUING',   'AMEX Issuing',                              false, NULL),
  ('LOCAL_ISS_V6',         'SSV6_ISSUING',   'Local/National regional scheme Issuing',    false, NULL),
  ('DIGITAL_HUB_MAIN',     'DIGITAL_HUB',    'Digital & Instant Payment Hub',             false, NULL),
  ('INSTANT_CLIENT_MAIN',  'INSTANT_CLIENT', 'Instant Payment Client',                    false, NULL),
  ('ITSP_HUB',             'CARD_DIGIT',     'ITSP Hub (Issuer Token Provider Hub)',      false, NULL),
  ('TOKENISATION_MAIN',    'TOKENISATION',   'Tokenisation',                              false, NULL),
  ('EBPP_MAIN',            'EBPP',           'EBPP Electronic Bill Payment & Presentment', false, NULL),
  ('ECOM_GW_MAIN',         'ECOM_GW',        'E-commerce Gateway',                        false, NULL),
  ('BNPL_ACQ_MAIN',        'BNPL_ACQ',       'BNPL Acquirer',                             false, NULL),
  ('BNPL_ISS_MAIN',        'BNPL_ISS',       'BNPL Issuer',                               false, NULL)
ON CONFLICT (article_code) DO NOTHING;

-- ============================================================================
-- 3. UTILISATEURS BACK-OFFICE (5 comptes — mot de passe Test1234! patché par seed.ts)
-- ============================================================================
-- Le placeholder password_hash est remplacé par seed.ts via bcrypt après l'INSERT.

INSERT INTO lic_users (matricule, nom, prenom, email, password_hash, telephone, role, actif, cree_par) VALUES
  ('MAT-001', 'OUALI',  'Kacem',  'k.ouali@s2m.ma',   '$2a$10$placeholder_will_be_patched_by_seed_ts_xxxxxxxxxxxxx', '+212 6 61 00 11 22', 'SADMIN', true,  'SYSTEM'),
  ('MAT-002', 'BAHI',   'Sara',   's.bahi@s2m.ma',    '$2a$10$placeholder_will_be_patched_by_seed_ts_xxxxxxxxxxxxx', '+212 6 62 00 33 44', 'ADMIN',  true,  'MAT-001'),
  ('MAT-003', 'FAHD',   'Amine',  'a.fahd@s2m.ma',    '$2a$10$placeholder_will_be_patched_by_seed_ts_xxxxxxxxxxxxx', '+212 6 63 00 55 66', 'ADMIN',  true,  'MAT-001'),
  ('MAT-004', 'MERIEM', 'Laila',  'l.meriem@s2m.ma',  '$2a$10$placeholder_will_be_patched_by_seed_ts_xxxxxxxxxxxxx', '+212 6 64 00 77 88', 'USER',   true,  'MAT-001'),
  ('MAT-005', 'HOUDA',  'Rania',  'r.houda@s2m.ma',   '$2a$10$placeholder_will_be_patched_by_seed_ts_xxxxxxxxxxxxx', '+212 6 65 00 99 00', 'USER',   false, 'MAT-001');

-- ============================================================================
-- 4. CLIENTS — 55 banques et institutions réelles SELECT-PX (DEC-016)
-- ============================================================================
-- Sales (4) en round-robin : Mounir BOUSNIN, Youssef BERRADA, Ahmed KHALIL, Issam CHAYBI
-- AM (7) en round-robin : Hakim HOUSSNI, Houssam ELISMAILI, Mounir BOUDERBA,
--                         Ghassan FAHMI, Jamal MOUJAHID, Omar HANDI, Nourddine BENASSEF
-- Dates : signature étalée de 2020-01-15 à fin 2024 (incrément 32 jours par client),
--         mise en prod = signature + 120 jours.

INSERT INTO lic_clients (
  code_client, raison_sociale, pays, region, langue, devise,
  sales_responsable, account_manager, statut_client,
  date_signature_contrat, date_mise_en_prod, actif, cree_par
)
SELECT
  v.code_client,
  v.raison_sociale,
  v.pays,
  v.region,
  v.langue,
  v.devise,
  v.sales,
  v.am,
  'ACTIF'::client_statut_enum,
  ('2020-01-15'::date + (v.rn * 32 * INTERVAL '1 day'))::date,
  ('2020-01-15'::date + (v.rn * 32 * INTERVAL '1 day') + INTERVAL '120 days')::date,
  true,
  'MAT-001'
FROM (VALUES
  (0,  'CDM',         'Crédit du Maroc',                'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Mounir BOUSNIN',  'Hakim HOUSSNI'),
  (1,  'CASHPLUS',    'CashPlus',                       'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Youssef BERRADA', 'Houssam ELISMAILI'),
  (2,  'DASHY',       'Dashy',                          'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Ahmed KHALIL',    'Mounir BOUDERBA'),
  (3,  'LAPOSTE_MA',  'La Poste Maroc',                 'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Issam CHAYBI',    'Ghassan FAHMI'),
  (4,  'CMI',         'Centre Monétique Interbancaire', 'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Mounir BOUSNIN',  'Jamal MOUJAHID'),
  (5,  'TRESORERIE',  'Trésorerie Générale',            'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Youssef BERRADA', 'Omar HANDI'),
  (6,  'BMCI',        'BMCI',                           'MA', 'NORD_AFRIQUE', 'fr', 'MAD', 'Ahmed KHALIL',    'Nourddine BENASSEF'),
  (7,  'ATTIJARI_TN', 'Attijari Bank Tunisie',          'TN', 'NORD_AFRIQUE', 'fr', 'TND', 'Issam CHAYBI',    'Hakim HOUSSNI'),
  (8,  'SKYTELECOM',  'SkyTelecom',                     'TN', 'NORD_AFRIQUE', 'fr', 'TND', 'Mounir BOUSNIN',  'Houssam ELISMAILI'),
  (9,  'LAPOSTE_TN',  'La Poste Tunisie',               'TN', 'NORD_AFRIQUE', 'fr', 'TND', 'Youssef BERRADA', 'Mounir BOUDERBA'),
  (10, 'BIAT',        'BIAT',                           'TN', 'NORD_AFRIQUE', 'fr', 'TND', 'Ahmed KHALIL',    'Ghassan FAHMI'),
  (11, 'TADAWUL',     'Tadawul',                        'LY', 'NORD_AFRIQUE', 'en', 'LYD', 'Issam CHAYBI',    'Jamal MOUJAHID'),
  (12, 'MASARAT',     'Masarat',                        'LY', 'NORD_AFRIQUE', 'en', 'LYD', 'Mounir BOUSNIN',  'Omar HANDI'),
  (13, 'ALYAKIN',     'Alyakin',                        'LY', 'NORD_AFRIQUE', 'en', 'LYD', 'Youssef BERRADA', 'Nourddine BENASSEF'),
  (14, 'ABCI',        'ABCI',                           'LY', 'NORD_AFRIQUE', 'en', 'LYD', 'Ahmed KHALIL',    'Hakim HOUSSNI'),
  (15, 'ALBARAKA',    'AlBaraka',                       'SD', 'NORD_AFRIQUE', 'en', 'SDG', 'Issam CHAYBI',    'Houssam ELISMAILI'),
  (16, 'BNP_DZ',      'BNP Paribas Algérie',            'DZ', 'NORD_AFRIQUE', 'en', 'DZD', 'Mounir BOUSNIN',  'Mounir BOUDERBA'),
  (17, 'SGA_DZ',      'Société Générale Algérie',       'DZ', 'NORD_AFRIQUE', 'en', 'DZD', 'Youssef BERRADA', 'Ghassan FAHMI'),
  (18, 'CHINGUITTY',  'Banque Chinguitty',              'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Ahmed KHALIL',    'Jamal MOUJAHID'),
  (19, 'GIMTEL',      'GimTel',                         'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Issam CHAYBI',    'Omar HANDI'),
  (20, 'BAMIS',       'BAMIS',                          'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Mounir BOUSNIN',  'Nourddine BENASSEF'),
  (21, 'BMCIM',       'BMCI Mauritanie',                'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Youssef BERRADA', 'Hakim HOUSSNI'),
  (22, 'BEA',         'BEA',                            'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Ahmed KHALIL',    'Houssam ELISMAILI'),
  (23, 'BPM',         'BPM',                            'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Issam CHAYBI',    'Mounir BOUDERBA'),
  (24, 'GBM',         'GBM',                            'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Mounir BOUSNIN',  'Ghassan FAHMI'),
  (25, 'NBM',         'NBM',                            'MR', 'AFRIQUE_FR',   'fr', 'MRU', 'Youssef BERRADA', 'Jamal MOUJAHID'),
  (26, 'BICICISN',    'BICICI Sénégal',                 'SN', 'AFRIQUE_FR',   'fr', 'XOF', 'Ahmed KHALIL',    'Omar HANDI'),
  (27, 'BNI_CI',      'BNI Côte d''Ivoire',             'CI', 'AFRIQUE_FR',   'fr', 'XOF', 'Issam CHAYBI',    'Nourddine BENASSEF'),
  (28, 'NSIA',        'NSIA',                           'CI', 'AFRIQUE_FR',   'fr', 'XOF', 'Mounir BOUSNIN',  'Hakim HOUSSNI'),
  (29, 'BICICICI',    'BICICI Côte d''Ivoire',          'CI', 'AFRIQUE_FR',   'fr', 'XOF', 'Youssef BERRADA', 'Houssam ELISMAILI'),
  (30, 'GIE',         'GIE Cameroun',                   'CM', 'AFRIQUE_FR',   'fr', 'XAF', 'Ahmed KHALIL',    'Mounir BOUDERBA'),
  (31, 'AFB',         'AFB',                            'CM', 'AFRIQUE_FR',   'fr', 'XAF', 'Issam CHAYBI',    'Ghassan FAHMI'),
  (32, 'BTCI',        'BTCI',                           'TG', 'AFRIQUE_FR',   'fr', 'XOF', 'Mounir BOUSNIN',  'Jamal MOUJAHID'),
  (33, 'SONIBANK',    'SONIBANK',                       'NE', 'AFRIQUE_FR',   'fr', 'XOF', 'Youssef BERRADA', 'Omar HANDI'),
  (34, 'RAWBANK',     'Rawbank',                        'CG', 'AFRIQUE_FR',   'fr', 'XAF', 'Ahmed KHALIL',    'Nourddine BENASSEF'),
  (35, 'BAO',         'BAO',                            'GQ', 'AFRIQUE_FR',   'fr', 'XAF', 'Issam CHAYBI',    'Hakim HOUSSNI'),
  (36, 'BCAB',        'BCAB',                           'BI', 'AFRIQUE_FR',   'fr', 'USD', 'Mounir BOUSNIN',  'Houssam ELISMAILI'),
  (37, 'ABAY',        'Abay Bank',                      'ET', 'AFRIQUE_EN',   'en', 'ETB', 'Youssef BERRADA', 'Mounir BOUDERBA'),
  (38, 'PSS',         'PSS',                            'ET', 'AFRIQUE_EN',   'en', 'ETB', 'Ahmed KHALIL',    'Ghassan FAHMI'),
  (39, 'AWASH',       'Awash Bank',                     'ET', 'AFRIQUE_EN',   'en', 'ETB', 'Issam CHAYBI',    'Jamal MOUJAHID'),
  (40, 'SLCB',        'SLCB',                           'NP', 'ASIE',         'en', 'NPR', 'Mounir BOUSNIN',  'Omar HANDI'),
  (41, 'HBL',         'HBL',                            'NP', 'ASIE',         'en', 'NPR', 'Youssef BERRADA', 'Nourddine BENASSEF'),
  (42, 'NIC',         'NIC',                            'NP', 'ASIE',         'en', 'NPR', 'Ahmed KHALIL',    'Hakim HOUSSNI'),
  (43, 'NI',          'National Bank Jordanie',         'JO', 'MOYEN_ORIENT', 'en', 'JOD', 'Issam CHAYBI',    'Houssam ELISMAILI'),
  (44, 'CAB',         'CAB',                            'JO', 'MOYEN_ORIENT', 'en', 'JOD', 'Mounir BOUSNIN',  'Mounir BOUDERBA'),
  (45, 'CAB_PL',      'CAB Private Label',              'JO', 'MOYEN_ORIENT', 'en', 'JOD', 'Youssef BERRADA', 'Ghassan FAHMI'),
  (46, 'MEPS',        'Meps',                           'JO', 'MOYEN_ORIENT', 'en', 'JOD', 'Ahmed KHALIL',    'Jamal MOUJAHID'),
  (47, 'CIHAN',       'Cihan Bank',                     'IQ', 'MOYEN_ORIENT', 'en', 'IQD', 'Issam CHAYBI',    'Omar HANDI'),
  (48, 'EGATE',       'eGate',                          'IQ', 'MOYEN_ORIENT', 'en', 'IQD', 'Mounir BOUSNIN',  'Nourddine BENASSEF'),
  (49, 'JIB',         'JIB',                            'IQ', 'MOYEN_ORIENT', 'en', 'IQD', 'Youssef BERRADA', 'Hakim HOUSSNI'),
  (50, 'IBY',         'IBY',                            'YE', 'MOYEN_ORIENT', 'en', 'YER', 'Ahmed KHALIL',    'Houssam ELISMAILI'),
  (51, 'POSTE_YE',    'Poste Yémen',                    'YE', 'MOYEN_ORIENT', 'en', 'YER', 'Issam CHAYBI',    'Mounir BOUDERBA'),
  (52, 'FH',          'FH Dubai',                       'AE', 'MOYEN_ORIENT', 'en', 'AED', 'Mounir BOUSNIN',  'Ghassan FAHMI'),
  (53, 'NBL',         'NBL France',                     'FR', 'EUROPE',       'fr', 'EUR', 'Youssef BERRADA', 'Jamal MOUJAHID'),
  (54, 'HUMM',        'Hummgroup',                      'AU', 'AUSTRALIE',    'en', 'AUD', 'Ahmed KHALIL',    'Omar HANDI')
) AS v(rn, code_client, raison_sociale, pays, region, langue, devise, sales, am);

-- ============================================================================
-- 5. ENTITÉS — 1 "Siège" par client
-- ============================================================================

INSERT INTO lic_entites (client_id, nom, pays, actif, cree_par)
SELECT id, 'Siège ' || raison_sociale, pays, true, 'MAT-001'
FROM lic_clients;

-- ============================================================================
-- 6. LICENCES DÉMO (5 + 1 cible renouvellement)
-- ============================================================================
-- LIC-2025-001 → CDM         — SPX Acquiring + Issuing + Core
-- LIC-2025-002 → ATTIJARI_TN — SPX Acquiring (en alerte)
-- LIC-2025-003 → BMCI        — SSV6 Issuing
-- LIC-2025-004 → BIAT        — Wallet + Digital Hub + Instant Client
-- LIC-2026-001 → BNI_CI      — SoftPOS + POS App
-- LIC-2027-001 → BIAT        — cible renouvellement (statut INACTIF)

INSERT INTO lic_licences (
  client_id, entite_id, reference, date_debut, date_fin, status,
  version, renouvellement_auto, notif_envoyee, cree_par
)
SELECT c.id, e.id, v.reference, v.date_debut, v.date_fin,
       v.status::licence_status_enum, 1, false, false, 'MAT-001'
FROM (VALUES
  ('CDM',         'LIC-2025-001', '2025-01-01'::timestamp, '2027-04-23'::timestamp, 'ACTIF'),
  ('ATTIJARI_TN', 'LIC-2025-002', '2025-03-15'::timestamp, '2027-03-14'::timestamp, 'ACTIF'),
  ('BMCI',        'LIC-2025-003', '2025-06-01'::timestamp, '2028-05-31'::timestamp, 'ACTIF'),
  ('BIAT',        'LIC-2025-004', '2025-09-01'::timestamp, '2027-08-31'::timestamp, 'ACTIF'),
  ('BNI_CI',      'LIC-2026-001', '2026-01-01'::timestamp, '2028-12-31'::timestamp, 'ACTIF'),
  ('BIAT',        'LIC-2027-001', '2027-09-01'::timestamp, '2030-08-31'::timestamp, 'INACTIF')
) AS v(code_client, reference, date_debut, date_fin, status)
JOIN lic_clients c ON c.code_client = v.code_client
JOIN lic_entites e ON e.client_id = c.id;

-- ============================================================================
-- 7. PRODUITS PAR LICENCE (lic_licence_produits)
-- ============================================================================

INSERT INTO lic_licence_produits (licence_id, produit_code, actif, date_activation, cree_par)
SELECT l.id, v.produit_code, true, l.date_debut, 'MAT-001'
FROM (VALUES
  ('LIC-2025-001', 'SPX_ACQUIRING'),
  ('LIC-2025-001', 'SPX_ISSUING'),
  ('LIC-2025-001', 'SPX_CORE'),
  ('LIC-2025-002', 'SPX_ACQUIRING'),
  ('LIC-2025-002', 'SPX_CORE'),
  ('LIC-2025-003', 'SSV6_ISSUING'),
  ('LIC-2025-003', 'SSV6_CORE'),
  ('LIC-2025-004', 'WALLET'),
  ('LIC-2025-004', 'DIGITAL_HUB'),
  ('LIC-2025-004', 'INSTANT_CLIENT'),
  ('LIC-2026-001', 'SOFTPOS'),
  ('LIC-2026-001', 'POS_APP')
) AS v(reference, produit_code)
JOIN lic_licences l ON l.reference = v.reference;

-- ============================================================================
-- 8. ARTICLES PAR LICENCE (lic_licence_articles)
-- ============================================================================
-- Articles AVEC volume contractuel (vol_contractuel != NULL)

INSERT INTO lic_licence_articles (
  licence_id, article_code, produit_code, actif,
  vol_contractuel, vol_consomme, seuil_alerte_pct
)
SELECT l.id, v.article_code, v.produit_code, true,
       v.vol_contractuel, v.vol_consomme, 80
FROM (VALUES
  -- LIC-2025-001 (CDM)
  ('LIC-2025-001', 'ATM_STD_SPX',         'SPX_ACQUIRING',  800::numeric,    312::numeric),
  ('LIC-2025-001', 'POS_STD_SPX',         'SPX_ACQUIRING',  5000::numeric,   1823::numeric),
  ('LIC-2025-001', 'ISS_INSTITUTION_SPX', 'SPX_ISSUING',    500000::numeric, 182000::numeric),
  ('LIC-2025-001', 'DEBIT_CARD_SPX',      'SPX_ISSUING',    300000::numeric, 154000::numeric),
  ('LIC-2025-001', 'CREDIT_CARD_SPX',     'SPX_ISSUING',    50000::numeric,  18000::numeric),
  -- LIC-2025-002 (ATTIJARI_TN) — pour démontrer ALERTE / DÉPASSÉ
  ('LIC-2025-002', 'POS_STD_SPX',         'SPX_ACQUIRING',  8000::numeric,   7234::numeric),
  ('LIC-2025-002', 'ATM_STD_SPX',         'SPX_ACQUIRING',  300::numeric,    312::numeric),
  ('LIC-2025-002', 'MERCHANT_PORTAL_SPX', 'SPX_ACQUIRING',  1500::numeric,   800::numeric),
  -- LIC-2025-003 (BMCI) — V6 Issuing
  ('LIC-2025-003', 'ISS_INSTITUTION_V6',  'SSV6_ISSUING',   400000::numeric, 340000::numeric),
  ('LIC-2025-003', 'DEBIT_CARD_V6',       'SSV6_ISSUING',   250000::numeric, 198000::numeric),
  ('LIC-2025-003', 'CREDIT_CARD_V6',      'SSV6_ISSUING',   80000::numeric,  63000::numeric),
  -- LIC-2025-004 (BIAT) — Wallet
  ('LIC-2025-004', 'WALLET_AGENT',        'WALLET',         5000::numeric,   1200::numeric),
  ('LIC-2025-004', 'WALLET_CUSTOMER',     'WALLET',         100000::numeric, 45000::numeric),
  -- LIC-2026-001 (BNI_CI) — SoftPOS + POS App
  ('LIC-2026-001', 'SOFTPOS_TERM',        'SOFTPOS',        2000::numeric,   850::numeric),
  ('LIC-2026-001', 'POS_APPLICATION',     'POS_APP',        1000::numeric,   320::numeric)
) AS v(reference, article_code, produit_code, vol_contractuel, vol_consomme)
JOIN lic_licences l ON l.reference = v.reference;

-- Articles SANS volume (présence/activation simple, vol_contractuel = NULL)

INSERT INTO lic_licence_articles (
  licence_id, article_code, produit_code, actif,
  vol_contractuel, vol_consomme, seuil_alerte_pct
)
SELECT l.id, v.article_code, v.produit_code, true, NULL, 0, 80
FROM (VALUES
  -- LIC-2025-001 (CDM)
  ('LIC-2025-001', 'KERNEL_SPX',          'SPX_CORE'),
  ('LIC-2025-001', 'ACQ_INST_SPX',        'SPX_ACQUIRING'),
  ('LIC-2025-001', 'ISS_BONUS_SPX',       'SPX_ISSUING'),
  -- LIC-2025-002 (ATTIJARI_TN)
  ('LIC-2025-002', 'KERNEL_SPX',          'SPX_CORE'),
  ('LIC-2025-002', 'ACQ_INST_SPX',        'SPX_ACQUIRING'),
  ('LIC-2025-002', 'VISA_POS_ACQ_SPX',    'SPX_ACQUIRING'),
  ('LIC-2025-002', 'MC_POS_ACQ_SPX',      'SPX_ACQUIRING'),
  -- LIC-2025-003 (BMCI)
  ('LIC-2025-003', 'KERNEL_V6',           'SSV6_CORE'),
  ('LIC-2025-003', 'VISA_ISS_V6',         'SSV6_ISSUING'),
  ('LIC-2025-003', 'MC_ISS_V6',           'SSV6_ISSUING'),
  -- LIC-2025-004 (BIAT)
  ('LIC-2025-004', 'DIGITAL_HUB_MAIN',    'DIGITAL_HUB'),
  ('LIC-2025-004', 'INSTANT_CLIENT_MAIN', 'INSTANT_CLIENT')
) AS v(reference, article_code, produit_code)
JOIN lic_licences l ON l.reference = v.reference;

-- ============================================================================
-- 9. SNAPSHOTS HISTORIQUES (6 mois sur LIC-2025-001 et LIC-2025-002)
-- ============================================================================
-- Croissance progressive : vol_consomme_fin(m) = consomme_actuel * (0.70 + 0.06*m)
-- pour m ∈ [0, 5]. Le snapshot le plus récent = consommation actuelle (m=5).
-- Calibrage : ratio (0.70 + 0.06*m) tel que m=5 atteint exactement 1.00.

INSERT INTO lic_article_volume_history (
  licence_article_id, periode,
  vol_consomme_debut, vol_consomme_fin, delta, vol_contractuel
)
SELECT
  la.id,
  -- 6 derniers mois jusqu'au mois courant (m=0 = il y a 5 mois, m=5 = ce mois)
  (date_trunc('month', CURRENT_DATE) - ((5 - gs.m) || ' months')::interval)::date,
  -- vol_consomme_debut : 65% du courant pour m=0, sinon vol_fin du mois précédent
  CASE WHEN gs.m = 0
       THEN ROUND(la.vol_consomme::numeric * 0.65)
       ELSE ROUND(la.vol_consomme::numeric * (0.70 + 0.06 * (gs.m - 1)))
  END,
  ROUND(la.vol_consomme::numeric * (0.70 + 0.06 * gs.m)),
  ROUND(la.vol_consomme::numeric * (0.70 + 0.06 * gs.m))
    - CASE WHEN gs.m = 0
           THEN ROUND(la.vol_consomme::numeric * 0.65)
           ELSE ROUND(la.vol_consomme::numeric * (0.70 + 0.06 * (gs.m - 1)))
      END,
  la.vol_contractuel
FROM lic_licence_articles la
JOIN lic_licences l ON l.id = la.licence_id
CROSS JOIN generate_series(0, 5) AS gs(m)
WHERE l.reference IN ('LIC-2025-001', 'LIC-2025-002')
  AND la.vol_contractuel IS NOT NULL;

-- ============================================================================
-- 10. RENOUVELLEMENTS DÉMO (3 dossiers sur BIAT — EC-11)
-- ============================================================================
-- Tous source = LIC-2025-004. La cible LIC-2027-001 (créée plus haut) est
-- raccrochée au dossier CREE.

INSERT INTO lic_renouvellement (
  licence_source_id, licence_cible_id, statut,
  date_creation_dossier, cree_par, date_validation, valide_par,
  date_cloture, commentaire
)
SELECT
  src.id, cible.id, 'CREE'::renew_status_enum,
  CURRENT_TIMESTAMP - INTERVAL '15 days', 'MAT-002',
  CURRENT_TIMESTAMP - INTERVAL '6 days', 'MAT-001',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  'Renouvellement BIAT validé — licence cible générée'
FROM lic_licences src
JOIN lic_licences cible ON cible.reference = 'LIC-2027-001'
WHERE src.reference = 'LIC-2025-004';

INSERT INTO lic_renouvellement (
  licence_source_id, statut, date_creation_dossier, cree_par,
  date_validation, valide_par, commentaire
)
SELECT
  l.id, 'VALIDE'::renew_status_enum,
  CURRENT_TIMESTAMP - INTERVAL '8 days', 'MAT-002',
  CURRENT_TIMESTAMP - INTERVAL '2 days', 'MAT-001',
  'Renouvellement BIAT validé — création de licence cible imminente'
FROM lic_licences l
WHERE l.reference = 'LIC-2025-004';

INSERT INTO lic_renouvellement (
  licence_source_id, statut, date_creation_dossier, cree_par, commentaire
)
SELECT
  l.id, 'EN_COURS'::renew_status_enum,
  CURRENT_TIMESTAMP - INTERVAL '2 days', 'MAT-002',
  'Brouillon — volumes proposés en cours de saisie ADMIN'
FROM lic_licences l
WHERE l.reference = 'LIC-2025-004';

-- ============================================================================
-- 11. ALERT CONFIG — 3 règles
-- ============================================================================

INSERT INTO lic_alert_config (
  client_id, seuil_pct, canal_alerte, email_dest, template_msg,
  statut, priorite, cree_par
) VALUES
  (NULL,                                                 80, 'BACKOFFICE'::alert_channel_enum, NULL,
   'Volume {module} chez {client} a atteint {pct}% ({consomme}/{total})',
   true, 99, 'MAT-001');

INSERT INTO lic_alert_config (
  client_id, seuil_pct, canal_alerte, email_dest, template_msg,
  statut, priorite, cree_par
)
SELECT c.id, 75, 'EMAIL_BO'::alert_channel_enum, 'monitoring@cdm.ma',
       'Crédit du Maroc — alerte volume {module} {pct}%',
       true, 10, 'MAT-001'
FROM lic_clients c WHERE c.code_client = 'CDM';

INSERT INTO lic_alert_config (
  client_id, seuil_pct, canal_alerte, email_dest, template_msg,
  statut, priorite, cree_par
)
SELECT c.id, 85, 'EMAIL'::alert_channel_enum, 'support@attijaribank.com.tn',
       'Attijari TN — seuil élevé volume {module} ({pct}%)',
       true, 20, 'MAT-001'
FROM lic_clients c WHERE c.code_client = 'ATTIJARI_TN';

-- ============================================================================
-- 12. NOTIFICATIONS DÉMO (3 in-app)
-- ============================================================================

INSERT INTO lic_notifications (
  user_id, type, title, message, priority, client_id, entity_type, entity_id, action_url, is_read
)
SELECT 'MAT-002', 'VOLUME_ALERT',
       'Volume POS dépassé chez Attijari TN',
       'L''article POS_STD_SPX a atteint 90% (7234/8000) sur la licence LIC-2025-002.',
       'HIGH'::notif_priority_enum,
       c.id, 'licence_article', la.id,
       '/licences/' || l.id::text,
       false
FROM lic_clients c
JOIN lic_licences l ON l.client_id = c.id AND l.reference = 'LIC-2025-002'
JOIN lic_licence_articles la ON la.licence_id = l.id AND la.article_code = 'POS_STD_SPX'
WHERE c.code_client = 'ATTIJARI_TN';

INSERT INTO lic_notifications (
  user_id, type, title, message, priority, client_id, entity_type, entity_id, action_url, is_read
)
SELECT 'MAT-002', 'RENEWAL_DUE',
       'Renouvellement BIAT à finaliser',
       'Le dossier de renouvellement de la licence LIC-2025-004 (BIAT) est en attente de validation SADMIN.',
       'MEDIUM'::notif_priority_enum,
       c.id, 'renewal', NULL,
       '/renewals',
       false
FROM lic_clients c WHERE c.code_client = 'BIAT';

INSERT INTO lic_notifications (
  user_id, type, title, message, priority, client_id, entity_type, entity_id, action_url, is_read, read_at
)
SELECT NULL, 'LICENCE_EXPIRED',
       'Licence CDM expire dans 90 jours',
       'La licence LIC-2025-001 (Crédit du Maroc) arrive à expiration le 2027-04-23.',
       'LOW'::notif_priority_enum,
       c.id, 'licence', l.id,
       '/licences/' || l.id::text,
       true, CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM lic_clients c
JOIN lic_licences l ON l.client_id = c.id AND l.reference = 'LIC-2025-001'
WHERE c.code_client = 'CDM';

-- ============================================================================
-- 13. AUDIT LOG DÉMO (5 entrées variées)
-- ============================================================================

INSERT INTO lic_audit_log (entity, entity_id, action, before_data, after_data, user_id, client_id, mode, metadata, created_at)
SELECT 'licence', l.id, 'CREATE', NULL,
       jsonb_build_object('reference', l.reference, 'status', 'ACTIF'),
       'MAT-001', l.client_id, 'MANUEL'::audit_mode_enum,
       jsonb_build_object('source', 'seed-demo'),
       CURRENT_TIMESTAMP - INTERVAL '60 days'
FROM lic_licences l WHERE l.reference = 'LIC-2025-001';

INSERT INTO lic_audit_log (entity, entity_id, action, before_data, after_data, user_id, client_id, mode, metadata, created_at)
SELECT 'licence_article', la.id, 'UPDATE',
       jsonb_build_object('volConsomme', '6500'),
       jsonb_build_object('volConsomme', '7234'),
       'MAT-002', l.client_id, 'MANUEL'::audit_mode_enum,
       jsonb_build_object('field', 'volConsomme', 'oldValue', 6500, 'newValue', 7234),
       CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM lic_licence_articles la
JOIN lic_licences l ON l.id = la.licence_id
WHERE l.reference = 'LIC-2025-002' AND la.article_code = 'POS_STD_SPX';

INSERT INTO lic_audit_log (entity, entity_id, action, before_data, after_data, user_id, client_id, mode, metadata, created_at)
SELECT 'alert', ac.id, 'CREATE', NULL,
       jsonb_build_object('seuil_pct', 75, 'canal_alerte', 'EMAIL_BO'),
       'MAT-001', ac.client_id, 'MANUEL'::audit_mode_enum,
       jsonb_build_object('scope', 'client-specific'),
       CURRENT_TIMESTAMP - INTERVAL '30 days'
FROM lic_alert_config ac WHERE ac.email_dest = 'monitoring@cdm.ma';

INSERT INTO lic_audit_log (entity, entity_id, action, before_data, after_data, user_id, client_id, mode, metadata, created_at)
SELECT 'licence', l.id, 'UPDATE',
       jsonb_build_object('renouvellement_auto', false),
       jsonb_build_object('renouvellement_auto', true),
       'MAT-003', l.client_id, 'MANUEL'::audit_mode_enum,
       jsonb_build_object('field', 'renouvellement_auto'),
       CURRENT_TIMESTAMP - INTERVAL '20 days'
FROM lic_licences l WHERE l.reference = 'LIC-2025-003';

INSERT INTO lic_audit_log (entity, entity_id, action, before_data, after_data, user_id, mode, metadata, created_at)
VALUES
  ('user', 5, 'DEACTIVATE',
   jsonb_build_object('actif', true),
   jsonb_build_object('actif', false),
   'MAT-001', 'MANUEL'::audit_mode_enum,
   jsonb_build_object('matricule', 'MAT-005', 'reason', 'départ équipe'),
   CURRENT_TIMESTAMP - INTERVAL '45 days');

-- ============================================================================
-- 14. BATCH EXECUTIONS DÉMO (2 runs + 1 log)
-- ============================================================================
-- Les jobs pg-boss sont insérés par seed.ts AVANT ce fichier (cf. seed.ts).
-- On crée 2 exécutions de snapshot-volumes (1 succès, 1 erreur) pour la démo
-- de l'écran EC-12.

DO $$
DECLARE
  v_job_id integer;
  v_exec_succes integer;
  v_exec_erreur integer;
BEGIN
  SELECT id INTO v_job_id FROM lic_batch_jobs WHERE job_code = 'snapshot-volumes';

  IF v_job_id IS NOT NULL THEN
    INSERT INTO lic_batch_executions (
      job_id, job_code, date_debut, date_fin, duree_secondes,
      status, nb_traites, nb_erreurs, message_retour, declenche_par
    ) VALUES (
      v_job_id, 'snapshot-volumes',
      date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 hour',
      date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 hour' + INTERVAL '8 seconds',
      8, 'SUCCES'::batch_status_enum, 15, 0,
      '0 ancien(s) + 15 article(s) snapshotés', 'SCHEDULER'::batch_declencheur_enum
    )
    RETURNING id INTO v_exec_succes;

    INSERT INTO lic_batch_executions (
      job_id, job_code, date_debut, date_fin, duree_secondes,
      status, nb_traites, nb_erreurs, message_retour, declenche_par
    ) VALUES (
      v_job_id, 'snapshot-volumes',
      date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '1 month') + INTERVAL '1 hour',
      date_trunc('month', CURRENT_TIMESTAMP - INTERVAL '1 month') + INTERVAL '1 hour' + INTERVAL '3 seconds',
      3, 'ERREUR'::batch_status_enum, 0, 1,
      'Connection refused — Postgres redémarré pendant le snapshot',
      'SCHEDULER'::batch_declencheur_enum
    )
    RETURNING id INTO v_exec_erreur;

    INSERT INTO lic_batch_logs (execution_id, niveau, message, donnee_ref, context)
    VALUES (
      v_exec_erreur, 'ERROR'::log_level_enum,
      'Connection terminated unexpectedly',
      'snapshot:start',
      jsonb_build_object('errorCode', 'ECONNRESET', 'attempt', 1)
    );

    -- Mise à jour des compteurs lic_batch_jobs
    UPDATE lic_batch_jobs SET
      nb_executions = (SELECT COUNT(*) FROM lic_batch_executions WHERE job_id = lic_batch_jobs.id),
      nb_succes     = (SELECT COUNT(*) FROM lic_batch_executions WHERE job_id = lic_batch_jobs.id AND status = 'SUCCES'),
      nb_erreurs    = (SELECT COUNT(*) FROM lic_batch_executions WHERE job_id = lic_batch_jobs.id AND status = 'ERREUR'),
      derniere_exec = (SELECT MAX(date_fin) FROM lic_batch_executions WHERE job_id = lic_batch_jobs.id);
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS POST-SEED
-- ============================================================================

SELECT 'lic_clients'                AS table_name, COUNT(*) AS rows FROM lic_clients
UNION ALL SELECT 'lic_entites',                COUNT(*) FROM lic_entites
UNION ALL SELECT 'lic_licences',               COUNT(*) FROM lic_licences
UNION ALL SELECT 'lic_licence_produits',       COUNT(*) FROM lic_licence_produits
UNION ALL SELECT 'lic_licence_articles',       COUNT(*) FROM lic_licence_articles
UNION ALL SELECT 'lic_article_volume_history', COUNT(*) FROM lic_article_volume_history
UNION ALL SELECT 'lic_users',                  COUNT(*) FROM lic_users
UNION ALL SELECT 'lic_renouvellement',         COUNT(*) FROM lic_renouvellement
UNION ALL SELECT 'lic_alert_config',           COUNT(*) FROM lic_alert_config
UNION ALL SELECT 'lic_notifications',          COUNT(*) FROM lic_notifications
UNION ALL SELECT 'lic_audit_log',              COUNT(*) FROM lic_audit_log
UNION ALL SELECT 'lic_batch_executions',       COUNT(*) FROM lic_batch_executions
ORDER BY table_name;
