CREATE TYPE "public"."licence_status_enum" AS ENUM('ACTIF', 'INACTIF', 'SUSPENDU', 'EXPIRE');--> statement-breakpoint
CREATE TYPE "public"."renew_status_enum" AS ENUM('EN_COURS', 'VALIDE', 'CREE', 'ANNULE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_licences" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"reference" varchar(30) NOT NULL,
	"client_id" uuid NOT NULL,
	"entite_id" uuid NOT NULL,
	"date_debut" timestamp with time zone NOT NULL,
	"date_fin" timestamp with time zone NOT NULL,
	"status" "licence_status_enum" DEFAULT 'ACTIF' NOT NULL,
	"commentaire" varchar(1000),
	"version" integer DEFAULT 0 NOT NULL,
	"renouvellement_auto" boolean DEFAULT false NOT NULL,
	"notif_envoyee" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid,
	CONSTRAINT "uq_licences_reference" UNIQUE("reference"),
	CONSTRAINT "ck_licences_date_fin_apres_debut" CHECK ("lic_licences"."date_fin" > "lic_licences"."date_debut"),
	CONSTRAINT "ck_licences_reference_format" CHECK ("lic_licences"."reference" ~ '^LIC-[0-9]{4}-[0-9]{3,}$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_renouvellements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"licence_id" uuid NOT NULL,
	"nouvelle_date_debut" timestamp with time zone NOT NULL,
	"nouvelle_date_fin" timestamp with time zone NOT NULL,
	"status" "renew_status_enum" DEFAULT 'EN_COURS' NOT NULL,
	"commentaire" varchar(1000),
	"validee_par" uuid,
	"date_validation" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	CONSTRAINT "ck_renouv_date_fin_apres_debut" CHECK ("lic_renouvellements"."nouvelle_date_fin" > "lic_renouvellements"."nouvelle_date_debut")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licences" ADD CONSTRAINT "lic_licences_client_id_lic_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lic_clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licences" ADD CONSTRAINT "lic_licences_entite_id_lic_entites_id_fk" FOREIGN KEY ("entite_id") REFERENCES "public"."lic_entites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licences" ADD CONSTRAINT "lic_licences_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licences" ADD CONSTRAINT "lic_licences_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_renouvellements" ADD CONSTRAINT "lic_renouvellements_licence_id_lic_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."lic_licences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_renouvellements" ADD CONSTRAINT "lic_renouvellements_validee_par_lic_users_id_fk" FOREIGN KEY ("validee_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_renouvellements" ADD CONSTRAINT "lic_renouvellements_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_client" ON "lic_licences" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_entite" ON "lic_licences" USING btree ("entite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_cree_par" ON "lic_licences" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_modifie_par" ON "lic_licences" USING btree ("modifie_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_status" ON "lic_licences" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licences_date_fin" ON "lic_licences" USING btree ("date_fin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renouvellements_licence" ON "lic_renouvellements" USING btree ("licence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renouvellements_cree_par" ON "lic_renouvellements" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renouvellements_valide_par" ON "lic_renouvellements" USING btree ("validee_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_renouvellements_status" ON "lic_renouvellements" USING btree ("status");