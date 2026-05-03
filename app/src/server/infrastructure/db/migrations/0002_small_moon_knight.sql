CREATE TABLE IF NOT EXISTS "lic_devises_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_devise" varchar(10) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"symbole" varchar(10),
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_devises_ref_code_devise" UNIQUE("code_devise")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_langues_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_langue" varchar(5) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_langues_ref_code_langue" UNIQUE("code_langue")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_pays_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_pays" varchar(2) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"region_code" varchar(50),
	"actif" boolean DEFAULT true NOT NULL,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_pays_ref_code_pays" UNIQUE("code_pays")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_regions_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"region_code" varchar(50) NOT NULL,
	"nom" varchar(100) NOT NULL,
	"dm_responsable" varchar(100),
	"actif" boolean DEFAULT true NOT NULL,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_regions_ref_region_code" UNIQUE("region_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" varchar(100) NOT NULL,
	"prenom" varchar(100),
	"email" varchar(200),
	"telephone" varchar(20),
	"role_team" varchar(20) NOT NULL,
	"region_code" varchar(50),
	"actif" boolean DEFAULT true NOT NULL,
	"date_creation" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_team_members_role" CHECK ("lic_team_members"."role_team" IN ('SALES','AM','DM'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_types_contact_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"libelle" varchar(100) NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_types_contact_ref_code" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_pays_ref" ADD CONSTRAINT "lic_pays_ref_region_code_lic_regions_ref_region_code_fk" FOREIGN KEY ("region_code") REFERENCES "public"."lic_regions_ref"("region_code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_team_members" ADD CONSTRAINT "lic_team_members_region_code_lic_regions_ref_region_code_fk" FOREIGN KEY ("region_code") REFERENCES "public"."lic_regions_ref"("region_code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_devises_ref_actif" ON "lic_devises_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_langues_ref_actif" ON "lic_langues_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pays_ref_region_code" ON "lic_pays_ref" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pays_ref_actif" ON "lic_pays_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_regions_ref_actif" ON "lic_regions_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_members_region_code" ON "lic_team_members" USING btree ("region_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_members_role" ON "lic_team_members" USING btree ("role_team");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_members_actif" ON "lic_team_members" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_types_contact_ref_actif" ON "lic_types_contact_ref" USING btree ("actif");