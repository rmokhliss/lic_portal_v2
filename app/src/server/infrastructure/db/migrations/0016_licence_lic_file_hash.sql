ALTER TABLE "lic_licences" ADD COLUMN "last_lic_file_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "lic_licences" ADD COLUMN "last_lic_file_generated_at" timestamp with time zone;