-- ============================================================================
-- Phase 2.B étape 1/7 — Seed bootstrap minimal des référentiels SADMIN
--
-- Inséré ici (et non dans le script db:seed) pour garantir que les valeurs
-- pivots sont présentes dès qu'une base vient d'être migrée, avant tout
-- démarrage applicatif. Le script db:seed (étape 5) viendra enrichir avec
-- pays + team-members + données démo réalistes.
--
-- Idempotent : ON CONFLICT DO NOTHING sur les colonnes UNIQUE business
-- (region_code, code_devise, code_langue, code) — pas sur l'id serial qui
-- n'est pas figé entre exécutions.
--
-- Pas de seed pour lic_pays_ref ni lic_team_members à ce stade (laissés au
-- script db:seed étape 5).
-- ============================================================================

-- 3 régions commerciales (couvrent le périmètre Afrique S2M).
INSERT INTO "lic_regions_ref" ("region_code", "nom") VALUES
    ('NORD_AFRIQUE',     'Afrique du Nord'),
    ('AFRIQUE_OUEST',    'Afrique de l''Ouest'),
    ('AFRIQUE_CENTRALE', 'Afrique Centrale')
ON CONFLICT ("region_code") DO NOTHING;
--> statement-breakpoint

-- 5 devises de facturation (MAD legacy, EUR/USD ISO, XOF/XAF zones franc CFA).
INSERT INTO "lic_devises_ref" ("code_devise", "nom", "symbole") VALUES
    ('MAD', 'Dirham marocain',          'DH'),
    ('EUR', 'Euro',                     '€'),
    ('USD', 'Dollar américain',         '$'),
    ('XOF', 'Franc CFA (UEMOA)',        'F CFA'),
    ('XAF', 'Franc CFA (CEMAC)',        'FCFA')
ON CONFLICT ("code_devise") DO NOTHING;
--> statement-breakpoint

-- 2 langues UI portail (FR par défaut, EN ajouté F-11 next-intl).
INSERT INTO "lic_langues_ref" ("code_langue", "nom") VALUES
    ('fr', 'Français'),
    ('en', 'English')
ON CONFLICT ("code_langue") DO NOTHING;
--> statement-breakpoint

-- 3 types de contacts client minimal (couvrent EC-Clients onglet Contacts).
INSERT INTO "lic_types_contact_ref" ("code", "libelle") VALUES
    ('ACHAT',       'Achats'),
    ('FACTURATION', 'Facturation'),
    ('TECHNIQUE',   'Technique')
ON CONFLICT ("code") DO NOTHING;
