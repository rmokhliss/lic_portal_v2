-- ⚠️ Édition manuelle post-Drizzle : ce fichier diverge du snapshot meta/0000_snapshot.json.
-- Drizzle ne couvre pas les colonnes GENERATED ni les index GIN tsvector.
-- Toute future modif de lic_audit_log.search_vector se fait par migration custom (pas db:generate).
--
-- Ajouts manuels en fin de fichier (cf. section "F-06 ÉDITION MANUELLE") :
--   1. Seed du compte SYSTEM dans lic_users (nil UUID RFC 9562)
--   2. ALTER lic_audit_log : DROP search_vector + ADD GENERATED ALWAYS STORED
--   3. CREATE INDEX GIN idx_audit_search

CREATE TYPE "public"."audit_mode" AS ENUM('MANUEL', 'API', 'JOB');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SADMIN', 'ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"entity" varchar(30) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"user_id" uuid NOT NULL,
	"user_display" varchar(200),
	"client_id" uuid,
	"client_display" varchar(200),
	"ip_address" varchar(45),
	"mode" "audit_mode" DEFAULT 'MANUEL' NOT NULL,
	"metadata" jsonb,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"matricule" varchar(20) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"prenom" varchar(100) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"telephone" varchar(20),
	"role" "user_role" NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	"derniere_connexion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid,
	CONSTRAINT "uq_users_matricule" UNIQUE("matricule"),
	CONSTRAINT "uq_users_email" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_audit_log" ADD CONSTRAINT "lic_audit_log_user_id_lic_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_settings" ADD CONSTRAINT "lic_settings_updated_by_lic_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_users" ADD CONSTRAINT "lic_users_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_users" ADD CONSTRAINT "lic_users_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "lic_audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_user" ON "lic_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "lic_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_settings_updated_by" ON "lic_settings" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_actif" ON "lic_users" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_cree_par" ON "lic_users" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_modifie_par" ON "lic_users" USING btree ("modifie_par");--> statement-breakpoint

-- ============================================================================
-- F-06 ÉDITION MANUELLE — seed SYSTEM + tsvector GENERATED + index GIN
-- ============================================================================

-- Compte SYSTEM (nil UUID RFC 9562). Cf. shared/src/constants/system-user.ts.
-- POSITIONNÉ AVANT le DROP/ADD search_vector : sur table peuplée, recalculer
-- un tsvector vide est inutile et fait un scan complet en cas de re-run.
-- password_hash : bcrypt cost 10 d'un mot de passe random 64 chars jeté
-- immédiatement (format valide, bcrypt.compare retourne false proprement).
-- actif = false : exclu automatiquement des listes UI (cohérent règle L5).
INSERT INTO "lic_users" (
    "id",
    "matricule",
    "nom",
    "prenom",
    "email",
    "password_hash",
    "must_change_password",
    "role",
    "actif",
    "created_at",
    "updated_at"
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'SYS-000',
    'SYSTEM',
    'Système',
    'system@s2m.local',
    '$2a$10$8oE0NRs/IzymGH5KL/XuguewPgWQCv4PeFYP9HpxgnxisQvhFE/0C',
    false,
    'SADMIN',
    false,
    NOW(),
    NOW()
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- DETTE-001 traitée d'entrée v2 : search_vector dénormalise user_display +
-- client_display dans le tsvector pour FTS performant (recherche dans le journal
-- audit avec noms humains, pas seulement IDs). Drizzle ne supporte pas les
-- colonnes GENERATED ALWAYS en natif → on DROP la colonne tsvector "vide" qu'il
-- a créée et on la recrée en GENERATED STORED.
ALTER TABLE "lic_audit_log" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "lic_audit_log"
    ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
        to_tsvector('french',
            coalesce("entity", '') || ' ' ||
            coalesce("action", '') || ' ' ||
            coalesce("user_display", '') || ' ' ||
            coalesce("client_display", '') || ' ' ||
            coalesce("before_data"::text, '') || ' ' ||
            coalesce("after_data"::text, '')
        )
    ) STORED;
--> statement-breakpoint

-- Index GIN obligatoire pour les requêtes WHERE search_vector @@ to_tsquery(...)
-- (Référentiel §4.15 : colonne fréquente en WHERE → index obligatoire).
CREATE INDEX "idx_audit_search" ON "lic_audit_log" USING GIN ("search_vector");