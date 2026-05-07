-- Phase 23 — volumes nullable : NULL = volume non défini (équivalent illimité
-- côté UI / .lic / .hc). Articles fonctionnalité (controle_volume=false) ont
-- toujours leurs volumes à NULL ; articles volumétriques peuvent être créés
-- sans volume puis renseignés plus tard. Migration des 0 existants vers NULL
-- sur les liaisons d'articles non-volumétriques uniquement (les articles
-- volumétriques avec volume=0 explicite sont préservés en attendant que
-- l'admin renseigne une valeur).
ALTER TABLE "lic_licence_articles" ALTER COLUMN "volume_autorise" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lic_licence_articles" ALTER COLUMN "volume_autorise" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lic_licence_articles" ALTER COLUMN "volume_consomme" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lic_licence_articles" ALTER COLUMN "volume_consomme" DROP NOT NULL;--> statement-breakpoint
-- Migrate les volumes 0 sur articles non-volumétriques vers NULL (cohérence
-- métier : ces articles n'ont jamais eu vocation à porter un volume).
UPDATE lic_licence_articles la
SET volume_autorise = NULL, volume_consomme = NULL
WHERE volume_autorise = 0 AND volume_consomme = 0
  AND EXISTS (
    SELECT 1 FROM lic_articles_ref a
    WHERE a.id = la.article_id AND a.controle_volume = false
  );--> statement-breakpoint
-- Note : la colonne `controle_volume` sur lic_articles_ref existe deja
-- (migration 0014 custom — drift snapshot Drizzle Kit corrige par cette ligne
-- conditionnelle au lieu d'un ADD COLUMN qui leverait "duplicate column").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lic_articles_ref' AND column_name = 'controle_volume'
  ) THEN
    ALTER TABLE lic_articles_ref ADD COLUMN controle_volume boolean DEFAULT true NOT NULL;
  END IF;
END $$;