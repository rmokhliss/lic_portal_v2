CREATE TYPE "public"."client_statut_enum" AS ENUM('PROSPECT', 'ACTIF', 'SUSPENDU', 'RESILIE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_clients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"code_client" varchar(20) NOT NULL,
	"raison_sociale" varchar(200) NOT NULL,
	"nom_contact" varchar(100),
	"email_contact" varchar(200),
	"tel_contact" varchar(20),
	"code_pays" varchar(2),
	"code_devise" varchar(10),
	"code_langue" varchar(5) DEFAULT 'fr',
	"sales_responsable" varchar(100),
	"account_manager" varchar(100),
	"statut_client" "client_statut_enum" DEFAULT 'ACTIF' NOT NULL,
	"date_signature_contrat" date,
	"date_mise_en_prod" date,
	"date_demarrage_support" date,
	"prochaine_date_renouvellement_support" date,
	"actif" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid,
	CONSTRAINT "uq_clients_code" UNIQUE("code_client")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_contacts_clients" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"entite_id" uuid NOT NULL,
	"type_contact_code" varchar(30) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"prenom" varchar(100),
	"email" varchar(200),
	"telephone" varchar(20),
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_entites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"client_id" uuid NOT NULL,
	"nom" varchar(200) NOT NULL,
	"code_pays" varchar(2),
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid,
	CONSTRAINT "uq_entites_client_nom" UNIQUE("client_id","nom")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_clients" ADD CONSTRAINT "lic_clients_code_pays_lic_pays_ref_code_pays_fk" FOREIGN KEY ("code_pays") REFERENCES "public"."lic_pays_ref"("code_pays") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_clients" ADD CONSTRAINT "lic_clients_code_devise_lic_devises_ref_code_devise_fk" FOREIGN KEY ("code_devise") REFERENCES "public"."lic_devises_ref"("code_devise") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_clients" ADD CONSTRAINT "lic_clients_code_langue_lic_langues_ref_code_langue_fk" FOREIGN KEY ("code_langue") REFERENCES "public"."lic_langues_ref"("code_langue") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_clients" ADD CONSTRAINT "lic_clients_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_clients" ADD CONSTRAINT "lic_clients_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_contacts_clients" ADD CONSTRAINT "lic_contacts_clients_entite_id_lic_entites_id_fk" FOREIGN KEY ("entite_id") REFERENCES "public"."lic_entites"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_contacts_clients" ADD CONSTRAINT "lic_contacts_clients_type_contact_code_lic_types_contact_ref_code_fk" FOREIGN KEY ("type_contact_code") REFERENCES "public"."lic_types_contact_ref"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_contacts_clients" ADD CONSTRAINT "lic_contacts_clients_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_contacts_clients" ADD CONSTRAINT "lic_contacts_clients_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_entites" ADD CONSTRAINT "lic_entites_client_id_lic_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lic_clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_entites" ADD CONSTRAINT "lic_entites_code_pays_lic_pays_ref_code_pays_fk" FOREIGN KEY ("code_pays") REFERENCES "public"."lic_pays_ref"("code_pays") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_entites" ADD CONSTRAINT "lic_entites_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_entites" ADD CONSTRAINT "lic_entites_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_actif" ON "lic_clients" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_statut" ON "lic_clients" USING btree ("statut_client");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_code_pays" ON "lic_clients" USING btree ("code_pays");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_code_devise" ON "lic_clients" USING btree ("code_devise");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_code_langue" ON "lic_clients" USING btree ("code_langue");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_cree_par" ON "lic_clients" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_modifie_par" ON "lic_clients" USING btree ("modifie_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_raison_sociale" ON "lic_clients" USING btree ("raison_sociale");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_clients_entite" ON "lic_contacts_clients" USING btree ("entite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_clients_type" ON "lic_contacts_clients" USING btree ("type_contact_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_clients_actif" ON "lic_contacts_clients" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_clients_cree_par" ON "lic_contacts_clients" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contacts_clients_modifie_par" ON "lic_contacts_clients" USING btree ("modifie_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entites_client" ON "lic_entites" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entites_code_pays" ON "lic_entites" USING btree ("code_pays");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entites_actif" ON "lic_entites" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entites_cree_par" ON "lic_entites" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entites_modifie_par" ON "lic_entites" USING btree ("modifie_par");--> statement-breakpoint

-- ============================================================================
-- ÉDITION MANUELLE 4.A — search_vector GENERATED + index GIN (FTS clients)
-- ============================================================================
-- Pattern repris de la migration 0000 F-06 (audit) : Drizzle ne supporte pas
-- les colonnes GENERATED ALWAYS STORED en natif → on DROP la colonne tsvector
-- "vide" générée par Drizzle Kit puis on la recrée en GENERATED STORED.
-- Toute future modif de lic_clients.search_vector se fait par migration custom
-- (pas db:generate).
--
-- ADR 0004 — recherche FTS Postgres française. Champs dénormalisés inclus :
--   code_client    : recherche par code court (BAM, ATW)
--   raison_sociale : nom légal (champ principal recherche utilisateur)
--   nom_contact    : nom du contact commercial (recherche par personne)
--   email_contact  : email contact (recherche partielle)
-- ============================================================================
ALTER TABLE "lic_clients" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "lic_clients"
    ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
        to_tsvector('french',
            coalesce("code_client", '') || ' ' ||
            coalesce("raison_sociale", '') || ' ' ||
            coalesce("nom_contact", '') || ' ' ||
            coalesce("email_contact", '')
        )
    ) STORED;
--> statement-breakpoint

-- Index GIN obligatoire pour requêtes WHERE search_vector @@ to_tsquery(...)
-- (Référentiel §4.15 : colonne fréquente en WHERE → index obligatoire).
CREATE INDEX "idx_clients_search" ON "lic_clients" USING GIN ("search_vector");