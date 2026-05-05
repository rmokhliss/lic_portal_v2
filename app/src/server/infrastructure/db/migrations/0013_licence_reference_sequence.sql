-- ============================================================================
-- Phase 16 — DETTE-LIC-011 résolue : séquence PG pour allocateNextReference
--
-- Avant : `SELECT MAX(reference) FROM lic_licences WHERE reference LIKE 'LIC-2026-%'`
--         + parse régex + +1 → race possible si 2 créations concurrentes
--         (deux SELECT lisent la même valeur, deux INSERTs avec la même ref →
--         l'un échoue sur uq_licences_reference, payload utilisateur perdu).
--
-- Après : `SELECT nextval('lic_licence_reference_seq')` atomique côté PG.
--         Format final composé en TS : `LIC-{YYYY}-{nextval():03d}`. La
--         séquence est globale (non-resetée par année) ; conséquence acceptée :
--         numérotation continue cross-années (ex: LIC-2027-123 au lieu de
--         LIC-2027-001 si la dernière de 2026 était LIC-2026-122). Les
--         banques ne se basent pas sur la numérotation pour leur audit interne.
--
-- Bootstrap : la séquence démarre à MAX(NNN) + 1 sur les licences existantes
-- (le repo legacy laissait des valeurs entre 1 et N), via `setval()` dans un
-- DO block. Idempotent : sur une BD fraîche, MAX retourne null → setval(1, false)
-- → nextval() retourne 1.
--
-- Reco évolution Référentiel v2.2+ — capitalisée R-41 dans
-- docs/referentiel-feedback.md : « Séquences PG pour références métier
-- monotones — évite races sans lock applicatif ».
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS "lic_licence_reference_seq" START 1;--> statement-breakpoint

-- Bootstrap : aligne la séquence sur MAX(NNN) des références existantes pour
-- ne pas re-générer une référence déjà utilisée (cas BD pré-Phase-16). On
-- extrait le suffixe NNN via regex sur les références au format LIC-YYYY-NNN.
DO $$
DECLARE
  max_n integer;
BEGIN
  SELECT COALESCE(MAX((regexp_match(reference, '^LIC-\d{4}-(\d+)$'))[1]::integer), 0)
    INTO max_n
    FROM "lic_licences"
   WHERE reference ~ '^LIC-\d{4}-\d+$';

  IF max_n > 0 THEN
    -- setval(seq, val, true) → next nextval() retourne val + 1.
    PERFORM setval('lic_licence_reference_seq', max_n, true);
  END IF;
END $$;
