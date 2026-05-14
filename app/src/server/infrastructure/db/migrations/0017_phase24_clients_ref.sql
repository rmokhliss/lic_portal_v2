-- ============================================================================
-- Phase 24 — Référentiel des codes clients S2M (lic_clients_ref)
--
-- Table simple en lecture seule depuis l'UI (onglet /settings/referentiels >
-- Clients), alimentée par le seed bootstrap depuis le set des vrais clients
-- S2M (extraits de phase4-clients.seed). Sert à l'autocomplétion à la
-- création client (/clients/new) : si le code saisi existe dans le
-- référentiel, raison_sociale est pré-remplie. Saisie libre toujours
-- autorisée — pas de FK depuis lic_clients vers ce référentiel.
--
-- PK = code_client lui-même (identifiant business stable) — pas de serial
-- intermédiaire, le code S2M est l'identité. Pattern référentiel léger.
--
-- IF NOT EXISTS pour idempotence (le drift snapshot Drizzle Kit peut faire
-- qu'une migration partiellement appliquée soit re-tentée).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "lic_clients_ref" (
	"code_client" varchar(50) PRIMARY KEY NOT NULL,
	"raison_sociale" varchar(255) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
