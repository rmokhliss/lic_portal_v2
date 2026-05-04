CREATE TYPE "public"."alert_channel_enum" AS ENUM('IN_APP', 'EMAIL', 'SMS');--> statement-breakpoint
CREATE TYPE "public"."batch_declencheur_enum" AS ENUM('SCHEDULED', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."batch_status_enum" AS ENUM('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."log_level_enum" AS ENUM('DEBUG', 'INFO', 'WARN', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."notif_priority_enum" AS ENUM('INFO', 'WARNING', 'CRITICAL');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_alert_configs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"client_id" uuid NOT NULL,
	"libelle" varchar(200) NOT NULL,
	"canaux" "alert_channel_enum"[] DEFAULT '{"IN_APP"}' NOT NULL,
	"seuil_volume_pct" integer,
	"seuil_date_jours" integer,
	"actif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cree_par" uuid,
	"modifie_par" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_batch_executions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"job_code" varchar(50) NOT NULL,
	"declencheur" "batch_declencheur_enum" DEFAULT 'SCHEDULED' NOT NULL,
	"status" "batch_status_enum" DEFAULT 'QUEUED' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"stats" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_batch_jobs" (
	"code" varchar(50) PRIMARY KEY NOT NULL,
	"libelle" varchar(200) NOT NULL,
	"description" varchar(1000),
	"schedule" varchar(100),
	"last_execution_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_batch_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"execution_id" uuid NOT NULL,
	"level" "log_level_enum" DEFAULT 'INFO' NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lic_notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" varchar(1000) NOT NULL,
	"href" varchar(500),
	"priority" "notif_priority_enum" DEFAULT 'INFO' NOT NULL,
	"source" varchar(40) NOT NULL,
	"metadata" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_alert_configs" ADD CONSTRAINT "lic_alert_configs_client_id_lic_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lic_clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_alert_configs" ADD CONSTRAINT "lic_alert_configs_cree_par_lic_users_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_alert_configs" ADD CONSTRAINT "lic_alert_configs_modifie_par_lic_users_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_batch_executions" ADD CONSTRAINT "lic_batch_executions_job_code_lic_batch_jobs_code_fk" FOREIGN KEY ("job_code") REFERENCES "public"."lic_batch_jobs"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_batch_logs" ADD CONSTRAINT "lic_batch_logs_execution_id_lic_batch_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."lic_batch_executions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lic_notifications" ADD CONSTRAINT "lic_notifications_user_id_lic_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."lic_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_batch_exec_job_created" ON "lic_batch_executions" USING btree ("job_code","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_batch_exec_status" ON "lic_batch_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_batch_logs_execution" ON "lic_batch_logs" USING btree ("execution_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "lic_notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "lic_notifications" USING btree ("user_id","created_at");