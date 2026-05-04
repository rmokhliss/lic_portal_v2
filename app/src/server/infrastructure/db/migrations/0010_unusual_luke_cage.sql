ALTER TABLE "lic_clients" ADD COLUMN "client_private_key_enc" text;--> statement-breakpoint
ALTER TABLE "lic_clients" ADD COLUMN "client_certificate_pem" text;--> statement-breakpoint
ALTER TABLE "lic_clients" ADD COLUMN "client_certificate_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clients_cert_expires_at" ON "lic_clients" USING btree ("client_certificate_expires_at");