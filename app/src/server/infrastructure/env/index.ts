// ==============================================================================
// LIC v2 — Validation des variables d'environnement (Référentiel §4.4)
//
// Toutes les variables d'environnement consommées par l'app sont déclarées
// et validées ici. Au démarrage, un échec de validation crashe le process avec
// un message explicite avant qu'aucune autre brique infra ne tente de booter.
//
// Usage : `import { env } from "@/server/infrastructure/env";`
// Ne JAMAIS lire `process.env.X` directement ailleurs dans le code applicatif.
// ==============================================================================

import { z } from "zod";

// Booléens transmis en chaîne par process.env — on accepte "true"/"false" stricts.
const boolFromString = z.enum(["true", "false"]).transform((v) => v === "true");

const envSchema = z.object({
  // --- Application ----------------------------------------------------------
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),

  // --- Branding produit (Référentiel §4.4) ----------------------------------
  NEXT_PUBLIC_PRODUCT_CODE: z.string().min(1).default("LIC"),
  NEXT_PUBLIC_PRODUCT_NAME: z.string().min(1).default("Licence Manager"),
  NEXT_PUBLIC_PRODUCT_SUFFIX: z.string().min(1).default("PORTAL"),

  // --- PostgreSQL -----------------------------------------------------------
  DATABASE_URL: z
    .url()
    .refine((url) => url.startsWith("postgresql://") || url.startsWith("postgres://"), {
      message: "DATABASE_URL doit commencer par postgresql:// ou postgres://",
    }),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),

  // --- Auth.js v5 -----------------------------------------------------------
  AUTH_SECRET: z.string().min(32),
  AUTH_TRUST_HOST: boolFromString.default(true),

  // --- Crypto / PKI (clé maîtresse de chiffrement au repos en BD) ----------
  APP_MASTER_KEY: z.string().min(32),

  // --- SMTP (mode simulé si SMTP_HOST absent) -------------------------------
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
  SMTP_SECURE: boolFromString.default(false),

  // --- Logging Pino ---------------------------------------------------------
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),

  // --- i18n -----------------------------------------------------------------
  DEFAULT_LOCALE: z.enum(["fr", "en"]).default("fr"),

  // --- Endpoint public clé CA (toggle ADR-0002) ----------------------------
  EXPOSE_S2M_CA_PUBLIC: boolFromString.default(false),

  // --- OpenTelemetry --------------------------------------------------------
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_SERVICE_NAME: z.string().min(1).default("s2m-lic"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    // Zod 4 émet code:"invalid_type" + message "expected X, received undefined"
    // pour une variable manquante. On remappe vers un wording human-friendly.
    const firstKey = issue.path[0];
    const isMissing =
      issue.code === "invalid_type" &&
      typeof firstKey === "string" &&
      process.env[firstKey] === undefined;
    const message = isMissing ? "Required (manquante)" : issue.message;
    return `- ${path} : ${message}`;
  });

  console.error(
    [
      "[env] Configuration invalide. Le serveur ne peut pas démarrer.",
      "",
      "Variables en erreur :",
      ...lines,
      "",
      "Voir .env.example pour la liste complète des variables attendues.",
    ].join("\n"),
  );
  process.exit(1);
}

export const env: Env = parsed.data;
