CREATE TYPE "public"."fichier_statut_enum" AS ENUM('GENERATED', 'IMPORTED', 'ERREUR');--> statement-breakpoint
CREATE TYPE "public"."fichier_type_enum" AS ENUM('LIC_GENERATED', 'HEALTHCHECK_IMPORTED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_fichiers_log" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"licence_id" uuid NOT NULL,
	"type" "fichier_type_enum" NOT NULL,
	"statut" "fichier_statut_enum" NOT NULL,
	"path" varchar(500) NOT NULL,
	"hash" varchar(64) NOT NULL,
	"metadata" jsonb,
	"error_message" text,
	"cree_par" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_fichiers_log" ADD CONSTRAINT "lic_fichiers_log_licence_id_lic_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."lic_licences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_fichiers_log" ADD CONSTRAINT "lic_fichiers_log_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fichiers_log_licence" ON "lic_fichiers_log" USING btree ("licence_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fichiers_log_type" ON "lic_fichiers_log" USING btree ("type");