-- Phase 23 — empreinte SHA-256 du contenu produit/article/volume au moment de
-- la derniere generation .lic + timestamp. Permet la detection "fichier .lic
-- obsolete" cote UI. IF NOT EXISTS pour idempotence (le drift snapshot
-- Drizzle Kit peut faire qu'une migration partiellement appliquee soit
-- re-tentee — sans IF NOT EXISTS le DDL leve "duplicate column").
ALTER TABLE "lic_licences" ADD COLUMN IF NOT EXISTS "last_lic_file_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "lic_licences" ADD COLUMN IF NOT EXISTS "last_lic_file_generated_at" timestamp with time zone;