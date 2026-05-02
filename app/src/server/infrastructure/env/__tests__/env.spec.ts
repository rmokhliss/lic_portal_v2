import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED_VALID_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://lic_portal:lic_portal_dev@localhost:5432/lic_portal",
  AUTH_SECRET: "a".repeat(32),
  APP_MASTER_KEY: "b".repeat(32),
};

// Helper : importe ../index et capture l'erreur thrown au top-level du module.
// Depuis le retrait de process.exit(1) (Edge-runtime safe, voir env/index.ts),
// le module throw directement un Error avec le message complet — le test asserte
// sur message via .toContain.
async function importEnvAndCatch(): Promise<Error> {
  let caught: unknown;
  try {
    await import("../index");
  } catch (e) {
    caught = e;
  }
  if (!(caught instanceof Error)) {
    // eslint-disable-next-line no-restricted-syntax -- test infra : sentinel pour signaler un setup invalide, pas une erreur métier
    throw new Error("expected env import to throw an Error, got " + String(caught));
  }
  return caught;
}

describe("env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("parses successfully with required variables and applies defaults", async () => {
    process.env = { ...originalEnv, ...REQUIRED_VALID_ENV };

    const mod = await import("../index");

    expect(mod.env.NODE_ENV).toBe("test");
    expect(mod.env.DATABASE_URL).toBe(REQUIRED_VALID_ENV.DATABASE_URL);
    expect(mod.env.AUTH_SECRET).toHaveLength(32);
    expect(mod.env.APP_MASTER_KEY).toHaveLength(32);
    // Defaults appliqués
    expect(mod.env.LOG_LEVEL).toBe("info");
    expect(mod.env.PORT).toBe(3000);
    expect(mod.env.NEXT_PUBLIC_PRODUCT_CODE).toBe("LIC");
    expect(mod.env.AUTH_TRUST_HOST).toBe(true);
    expect(mod.env.SMTP_SECURE).toBe(false);
    // SMTP optionnels absents
    expect(mod.env.SMTP_HOST).toBeUndefined();
  });

  it("crashes with explicit message when required variables are missing", async () => {
    // On part d'un env propre où les variables critiques sont absentes.
    process.env = { NODE_ENV: "test" };

    const error = await importEnvAndCatch();

    expect(error.message).toContain(
      "[env] Configuration invalide. Le serveur ne peut pas démarrer.",
    );
    expect(error.message).toContain("DATABASE_URL : Required (manquante)");
    expect(error.message).toContain("AUTH_SECRET");
    expect(error.message).toContain("APP_MASTER_KEY");
    expect(error.message).toContain(
      "Voir .env.example pour la liste complète des variables attendues.",
    );
  });

  it("crashes when DATABASE_URL has a non-postgres scheme", async () => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_VALID_ENV,
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
    };

    const error = await importEnvAndCatch();

    expect(error.message).toContain(
      "DATABASE_URL : DATABASE_URL doit commencer par postgresql:// ou postgres://",
    );
  });

  // === F-07 — bootstrap admin INITIAL_ADMIN_* ===

  it("parses successfully when the 3 INITIAL_ADMIN_* are all present and valid", async () => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_VALID_ENV,
      INITIAL_ADMIN_EMAIL: "admin@s2m.local",
      INITIAL_ADMIN_PASSWORD: "ChangeMe-F07-DevOnly-A8x2!",
      INITIAL_ADMIN_MATRICULE: "MAT-001",
    };

    const mod = await import("../index");

    expect(mod.env.INITIAL_ADMIN_EMAIL).toBe("admin@s2m.local");
    expect(mod.env.INITIAL_ADMIN_PASSWORD).toBe("ChangeMe-F07-DevOnly-A8x2!");
    expect(mod.env.INITIAL_ADMIN_MATRICULE).toBe("MAT-001");
  });

  it("crashes when only some INITIAL_ADMIN_* are present (state partial)", async () => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_VALID_ENV,
      INITIAL_ADMIN_EMAIL: "admin@s2m.local",
      // PASSWORD et MATRICULE volontairement absents → état partiel ambigu
    };

    const error = await importEnvAndCatch();

    expect(error.message).toContain("INITIAL_ADMIN_*");
    expect(error.message).toContain("TOUS présents OU TOUS absents");
  });

  it("crashes when INITIAL_ADMIN_MATRICULE doesn't match MAT-NNN", async () => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_VALID_ENV,
      INITIAL_ADMIN_EMAIL: "admin@s2m.local",
      INITIAL_ADMIN_PASSWORD: "ChangeMe-F07-DevOnly-A8x2!",
      INITIAL_ADMIN_MATRICULE: "MAT-1", // 1 chiffre au lieu de 3
    };

    const error = await importEnvAndCatch();

    expect(error.message).toContain("INITIAL_ADMIN_MATRICULE");
    expect(error.message).toContain("MAT-NNN");
  });

  it("crashes when INITIAL_ADMIN_PASSWORD is shorter than 12 chars", async () => {
    process.env = {
      ...originalEnv,
      ...REQUIRED_VALID_ENV,
      INITIAL_ADMIN_EMAIL: "admin@s2m.local",
      INITIAL_ADMIN_PASSWORD: "TooShort-1!", // 11 chars
      INITIAL_ADMIN_MATRICULE: "MAT-001",
    };

    const error = await importEnvAndCatch();

    expect(error.message).toContain("INITIAL_ADMIN_PASSWORD");
  });
});
