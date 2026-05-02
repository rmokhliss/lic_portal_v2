import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sentinel error used to short-circuit the `process.exit(1)` mock so that
// `import("../index")` rejects instead of returning. We use a dedicated class
// rather than `new Error()` (forbidden by the project's no-restricted-syntax
// rule that mandates typed errors with SPX-LIC-NNN codes in production code).
class TestExitSentinel extends Error {}

const REQUIRED_VALID_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://lic_portal:lic_portal_dev@localhost:5432/lic_portal",
  AUTH_SECRET: "a".repeat(32),
  APP_MASTER_KEY: "b".repeat(32),
};

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
    const cleanEnv: NodeJS.ProcessEnv = { NODE_ENV: "test" };
    process.env = cleanEnv;

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // silencieux pendant le test
    });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((_code?: number) => {
      throw new TestExitSentinel("__test_exit__");
    }) as never);

    await expect(import("../index")).rejects.toThrow("__test_exit__");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const errorMessage = errorSpy.mock.calls[0]?.[0] as string;
    expect(errorMessage).toContain(
      "[env] Configuration invalide. Le serveur ne peut pas démarrer.",
    );
    expect(errorMessage).toContain("DATABASE_URL : Required (manquante)");
    expect(errorMessage).toContain("AUTH_SECRET");
    expect(errorMessage).toContain("APP_MASTER_KEY");
    expect(errorMessage).toContain(
      "Voir .env.example pour la liste complète des variables attendues.",
    );
  });
});
