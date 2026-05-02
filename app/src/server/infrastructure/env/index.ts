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

  // --- Bootstrap admin initial (F-07) --------------------------------------
  // Crée un user SADMIN avec must_change_password=true au démarrage SI aucun
  // SADMIN actif n'existe encore en BD ET les 3 vars sont présentes.
  // Sinon : skip silencieux. Cf. helper bootstrapAdmin() dans infra/auth.
  // Tout-ou-rien : les 3 doivent être présentes ensemble (validé par .refine()
  // ci-dessous), sinon état partiel ambigu et le serveur refuse de démarrer.
  INITIAL_ADMIN_EMAIL: z.email().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).optional(),
  INITIAL_ADMIN_MATRICULE: z
    .string()
    .regex(/^MAT-\d{3}$/, "Format attendu : MAT-NNN (3 chiffres)")
    .optional(),
});

// Validation transverse : les 3 vars INITIAL_ADMIN_* sont tout-ou-rien.
const envSchemaWithRefine = envSchema.refine(
  (data) => {
    const present = [
      data.INITIAL_ADMIN_EMAIL,
      data.INITIAL_ADMIN_PASSWORD,
      data.INITIAL_ADMIN_MATRICULE,
    ].filter((v) => v !== undefined).length;
    return present === 0 || present === 3;
  },
  {
    message:
      "INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD et INITIAL_ADMIN_MATRICULE doivent être TOUS présents OU TOUS absents (état partiel ambigu)",
    path: ["INITIAL_ADMIN_*"],
  },
);

export type Env = z.infer<typeof envSchemaWithRefine>;

const parsed = envSchemaWithRefine.safeParse(process.env);

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

  // Throw au lieu de process.exit(1) pour rester Edge-runtime safe (le module
  // peut être tiré dans un bundle Edge via une chaîne d'imports — route
  // handlers Edge, futurs proxy/middleware, etc.). Le throw au top-level
  // d'un module ESM crash le boot Node avec exit code 1 tout en restant
  // compatible Edge runtime.
  //
  // Exception à la règle "pas de new Error" : ce code s'exécute au boot du
  // module ESM, AVANT que le serveur ne soit prêt. Aucun consommateur (UI, HTTP,
  // catalogue d'erreurs) n'est encore initialisé. Le message va directement sur
  // stderr du process parent. Introduire ici une AppError typée ajouterait
  // une dépendance fragile (cycle potentiel env ← error) sans bénéfice.
  // eslint-disable-next-line no-restricted-syntax -- bootstrap-time, voir commentaire ci-dessus
  throw new Error(
    [
      "[env] Configuration invalide. Le serveur ne peut pas démarrer.",
      "",
      "Variables en erreur :",
      ...lines,
      "",
      "Voir .env.example pour la liste complète des variables attendues.",
    ].join("\n"),
  );
}

export const env: Env = parsed.data;
