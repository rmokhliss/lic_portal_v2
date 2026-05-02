import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  // Pré-conditions env pour que le module env passe le parse.
  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://lic_portal:lic_portal_dev@localhost:5432/lic_portal",
    AUTH_SECRET: "a".repeat(32),
    APP_MASTER_KEY: "b".repeat(32),
    LOG_LEVEL: "info",
  };
  process.env = testEnv;
});

describe("logger", () => {
  it("createChildLogger returns a logger with a `module` binding", async () => {
    const { createChildLogger } = await import("../index");
    const child = createChildLogger("test-module");

    // Pino expose les bindings (champs hérités) du child via .bindings()
    expect(child.bindings()).toMatchObject({ module: "test-module" });
  });

  it('base logger carries the `app: "lic"` binding', async () => {
    const { logger } = await import("../index");
    expect(logger.bindings()).toMatchObject({ app: "lic" });
  });
});
