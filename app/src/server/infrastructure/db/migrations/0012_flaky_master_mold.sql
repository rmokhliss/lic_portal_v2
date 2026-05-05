-- Phase 15 — Brute-force lockout (audit Master Mai 2026 / Référentiel v2.1 §4.17).
-- Ajoute 2 colonnes à lic_users :
--   - failed_login_count : compteur d'échecs de login consécutifs (reset à 0 sur succès).
--   - last_failed_login_at : horodatage du dernier échec, sert à fenêtrer le lockout 60 min.
--
-- Lockout : 5 échecs consécutifs dans une fenêtre de 60 min → SPX-LIC-803 (compte verrouillé).
--
-- Note : Drizzle Kit a aussi détecté ALTER TYPE audit_mode ADD VALUE 'SCRIPT'
-- (déjà fait par migration 0011 — custom, snapshots non régénérés à l'époque).
-- Ligne retirée pour éviter le conflit "value already exists" sur les BDs
-- déjà migrées 0011.

ALTER TABLE "lic_users" ADD COLUMN "failed_login_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lic_users" ADD COLUMN "last_failed_login_at" timestamp with time zone;
