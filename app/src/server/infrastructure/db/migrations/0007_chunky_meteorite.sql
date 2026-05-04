CREATE TABLE IF NOT EXISTS "lic_articles_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"produit_id" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"nom" varchar(200) NOT NULL,
	"description" varchar(1000),
	"unite_volume" varchar(30) DEFAULT 'transactions' NOT NULL,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_articles_ref_produit_code" UNIQUE("produit_id","code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_licence_articles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"licence_id" uuid NOT NULL,
	"article_id" integer NOT NULL,
	"volume_autorise" integer DEFAULT 0 NOT NULL,
	"volume_consomme" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid,
	CONSTRAINT "uq_licence_articles_licence_article" UNIQUE("licence_id","article_id"),
	CONSTRAINT "ck_licence_articles_volume_autorise_pos" CHECK ("lic_licence_articles"."volume_autorise" >= 0),
	CONSTRAINT "ck_licence_articles_volume_consomme_pos" CHECK ("lic_licence_articles"."volume_consomme" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_licence_produits" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"licence_id" uuid NOT NULL,
	"produit_id" integer NOT NULL,
	"date_ajout" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	CONSTRAINT "uq_licence_produits_licence_produit" UNIQUE("licence_id","produit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_produits_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"nom" varchar(200) NOT NULL,
	"description" varchar(1000),
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "uq_produits_ref_code" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_article_volume_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"licence_id" uuid NOT NULL,
	"article_id" integer NOT NULL,
	"periode" date NOT NULL,
	"volume_autorise" integer NOT NULL,
	"volume_consomme" integer NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_volume_history_licence_article_periode" UNIQUE("licence_id","article_id","periode"),
	CONSTRAINT "ck_volume_history_autorise_pos" CHECK ("lic_article_volume_history"."volume_autorise" >= 0),
	CONSTRAINT "ck_volume_history_consomme_pos" CHECK ("lic_article_volume_history"."volume_consomme" >= 0)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_articles_ref" ADD CONSTRAINT "lic_articles_ref_produit_id_lic_produits_ref_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."lic_produits_ref"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_articles" ADD CONSTRAINT "lic_licence_articles_licence_id_lic_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."lic_licences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_articles" ADD CONSTRAINT "lic_licence_articles_article_id_lic_articles_ref_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."lic_articles_ref"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_articles" ADD CONSTRAINT "lic_licence_articles_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_articles" ADD CONSTRAINT "lic_licence_articles_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_produits" ADD CONSTRAINT "lic_licence_produits_licence_id_lic_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."lic_licences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_produits" ADD CONSTRAINT "lic_licence_produits_produit_id_lic_produits_ref_id_fk" FOREIGN KEY ("produit_id") REFERENCES "public"."lic_produits_ref"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_licence_produits" ADD CONSTRAINT "lic_licence_produits_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_article_volume_history" ADD CONSTRAINT "lic_article_volume_history_licence_id_lic_licences_id_fk" FOREIGN KEY ("licence_id") REFERENCES "public"."lic_licences"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_article_volume_history" ADD CONSTRAINT "lic_article_volume_history_article_id_lic_articles_ref_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."lic_articles_ref"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_articles_ref_produit" ON "lic_articles_ref" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_articles_ref_actif" ON "lic_articles_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_articles_licence" ON "lic_licence_articles" USING btree ("licence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_articles_article" ON "lic_licence_articles" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_articles_cree_par" ON "lic_licence_articles" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_articles_modifie_par" ON "lic_licence_articles" USING btree ("modifie_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_produits_licence" ON "lic_licence_produits" USING btree ("licence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_produits_produit" ON "lic_licence_produits" USING btree ("produit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licence_produits_cree_par" ON "lic_licence_produits" USING btree ("cree_par");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_produits_ref_actif" ON "lic_produits_ref" USING btree ("actif");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_volume_history_licence" ON "lic_article_volume_history" USING btree ("licence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_volume_history_article" ON "lic_article_volume_history" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_volume_history_periode" ON "lic_article_volume_history" USING btree ("periode");