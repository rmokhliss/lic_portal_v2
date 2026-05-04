-- Phase 3.E.0 — Étend audit_mode_enum pour le mode SCRIPT (scripts pnpm one-shot
-- comme `script:backfill-client-certs` Phase 3.E). Mode déjà supporté côté code
-- typé (audit-entry.entity.ts). `IF NOT EXISTS` (Postgres 9.6+) garantit
-- l'idempotence — relance silencieuse si la valeur existe déjà.
--
-- ⚠ Important : `ALTER TYPE ... ADD VALUE` ne peut PAS être exécuté dans un
-- bloc DO/PL-pgSQL sur Postgres ≤ 17 (les nouvelles valeurs d'enum ne sont pas
-- committables avant la fin du bloc). Statement nu obligatoire.

ALTER TYPE "public"."audit_mode" ADD VALUE IF NOT EXISTS 'SCRIPT';
