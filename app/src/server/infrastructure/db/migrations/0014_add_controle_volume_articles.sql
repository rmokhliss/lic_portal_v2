-- ============================================================================
-- Phase 19 — R-13 : champ controle_volume sur lic_articles_ref
--
-- Objectif : permettre au SADMIN de marquer certains articles comme
-- "non volumétriques" (ex: ATM-ADV, POS-ADV — fonctionnalités). Pour ces
-- articles, le wizard d'ajout à une licence n'affichera pas le champ
-- "vol autorisé" (substitué par "Illimité").
--
-- Default true + NOT NULL : tous les articles existants conservent leur
-- comportement actuel (volume contrôlé). Le seed Phase 19 met à jour les
-- articles "fonctionnalités" à false en post-INSERT.
--
-- Idempotent côté Drizzle Kit : la migration ne tourne qu'une fois (via le
-- journal). Pas de IF NOT EXISTS sur ADD COLUMN PG (syntaxe non supportée
-- en PG 18 sans extension) — la garde est purement journalière.
-- ============================================================================

ALTER TABLE "lic_articles_ref"
  ADD COLUMN "controle_volume" boolean DEFAULT true NOT NULL;
