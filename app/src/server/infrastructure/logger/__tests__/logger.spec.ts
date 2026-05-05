import { beforeAll, describe, expect, it, vi } from "vitest";
import pino from "pino";

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

// Phase 15 — audit Master Mai 2026, redaction PII obligatoire (BLOQUANT prod).
// On instancie un pino logger isolé avec le MÊME shape de redaction que le
// module index.ts pour vérifier que les paths sensibles sont bien censurés.
// Plus déterministe qu'intercepter `process.stdout.write` du logger global.
//
// Note technique : on capture la sortie via un stream pino custom plutôt qu'un
// vi.spyOn(process.stdout) pour éviter les régressions cross-tests (autres
// suites qui logguent en parallèle).

describe("logger — redaction PII (Phase 15 — audit Master)", () => {
  function captureLogPayload(input: Record<string, unknown>): string {
    const lines: string[] = [];
    const stream = {
      write(line: string) {
        lines.push(line);
      },
    };
    const testLogger = pino(
      {
        level: "info",
        base: undefined,
        timestamp: false,
        redact: {
          paths: [
            "password",
            "passwordHash",
            "hashed_password",
            "currentPassword",
            "newPassword",
            "generatedPassword",
            "newPasswordTemp",
            "*.password",
            "*.passwordHash",
            "*.hashed_password",
            "*.currentPassword",
            "*.newPassword",
            "*.generatedPassword",
            "*.newPasswordTemp",
            "token",
            "authorization",
            "*.token",
            "*.authorization",
            "headers.authorization",
            "headers.cookie",
            "pan",
            "cvv",
            "*.pan",
            "*.cvv",
          ],
          censor: "[REDACTED]",
        },
      },
      stream,
    );
    testLogger.info(input, "test");
    return lines.join("");
  }

  it("redacts password fields top-level + nested", () => {
    const out = captureLogPayload({
      password: "secret123",
      currentPassword: "old-pass",
      newPassword: "new-pass",
      generatedPassword: "gen-pass",
      user: { password: "nested-secret", passwordHash: "$2a$..." },
    });
    expect(out).not.toContain("secret123");
    expect(out).not.toContain("old-pass");
    expect(out).not.toContain("new-pass");
    expect(out).not.toContain("gen-pass");
    expect(out).not.toContain("nested-secret");
    expect(out).not.toContain("$2a$..");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts token + authorization fields", () => {
    const out = captureLogPayload({
      token: "bearer-xyz-secret",
      authorization: "Bearer abc.def.ghi",
      session: { token: "session-token-xyz" },
    });
    expect(out).not.toContain("bearer-xyz-secret");
    expect(out).not.toContain("Bearer abc.def.ghi");
    expect(out).not.toContain("session-token-xyz");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts headers.authorization + headers.cookie", () => {
    const out = captureLogPayload({
      headers: {
        authorization: "Bearer auth-secret-123",
        cookie: "session=abcdef; csrf=xyz",
        "user-agent": "Mozilla/5.0",
      },
    });
    expect(out).not.toContain("auth-secret-123");
    expect(out).not.toContain("session=abcdef");
    expect(out).toContain("Mozilla/5.0"); // header non sensible préservé
    expect(out).toContain("[REDACTED]");
  });

  it("redacts PCI-DSS fields pan + cvv", () => {
    const out = captureLogPayload({
      pan: "4111111111111111",
      cvv: "123",
      payment: { pan: "5555444433332222", cvv: "999" },
    });
    expect(out).not.toContain("4111111111111111");
    expect(out).not.toContain("5555444433332222");
    expect(out).not.toContain('"cvv":"123"');
    expect(out).not.toContain('"cvv":"999"');
    expect(out).toContain("[REDACTED]");
  });
});

void vi; // évite warning import inutilisé si la suite redaction vit isolée.
