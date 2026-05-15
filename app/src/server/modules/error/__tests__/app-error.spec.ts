import { afterEach, describe, expect, it, vi } from "vitest";

import { isAppError } from "@s2m-lic/shared/constants/error-codes";

import { NotFoundError, UnauthorizedError } from "../errors";

describe("AppError — guard runtime classe ↔ code", () => {
  it("throw une Error native quand le code et la classe ne correspondent pas", () => {
    expect(() => new NotFoundError({ code: "SPX-LIC-001" })).toThrow(
      "Code SPX-LIC-001 déclaré pour UnauthorizedError, levé depuis NotFoundError",
    );
  });

  it("l'erreur native levée n'est PAS un AppError (évite la récursion)", () => {
    let thrown: unknown;
    try {
      // Code 002 = UnauthorizedError → instancier en NotFoundError doit casser.
      new NotFoundError({ code: "SPX-LIC-002" });
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect(isAppError(thrown)).toBe(false);
  });
});

describe("AppError.toJSON()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("inclut stack et cause hors production", () => {
    vi.stubEnv("NODE_ENV", "test");
    // eslint-disable-next-line no-restricted-syntax -- test fixture : on simule une cause Error
    const cause = new Error("db error");
    const err = new NotFoundError({ code: "SPX-LIC-902", cause });

    const json = err.toJSON();

    expect(json.code).toBe("SPX-LIC-902");
    expect(json.message).toBe("Ressource introuvable");
    expect(json.httpStatus).toBe(404);
    expect(typeof json.stack).toBe("string");
    expect(json.stack).toContain("NotFoundError");
    expect(json.cause).toEqual({ message: "db error", stack: cause.stack });
  });

  it("exclut stack et cause en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = new NotFoundError({
      code: "SPX-LIC-902",
      // eslint-disable-next-line no-restricted-syntax -- test fixture : on vérifie que la cause est éludée
      cause: new Error("db"),
    });

    const json = err.toJSON();

    expect(json.code).toBe("SPX-LIC-902");
    expect(json.httpStatus).toBe(404);
    expect("stack" in json).toBe(false);
    expect("cause" in json).toBe(false);
  });

  it("details: undefined n'apparaît PAS dans le JSON", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new NotFoundError({ code: "SPX-LIC-902" });

    const json = err.toJSON();

    expect("details" in json).toBe(false);
    expect(json).not.toHaveProperty("details");
  });

  it("details fourni est conservé tel quel dans le JSON", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new NotFoundError({
      code: "SPX-LIC-902",
      details: { entity: "client", id: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001" },
    });

    expect(err.toJSON().details).toEqual({
      entity: "client",
      id: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
    });
  });

  it("cause string : sérialisée via String(cause)", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new NotFoundError({ code: "SPX-LIC-902", cause: "boom" });

    expect(err.toJSON().cause).toBe("boom");
  });

  it("cause objet quelconque (non-Error) : sérialisée via String(cause)", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new NotFoundError({ code: "SPX-LIC-902", cause: { foo: 1 } });

    // String({ foo: 1 }) === "[object Object]" — comportement attendu et documenté.
    expect(err.toJSON().cause).toBe("[object Object]");
  });

  it("override message via opts.message", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new UnauthorizedError({
      code: "SPX-LIC-001",
      message: "Custom auth message",
    });

    expect(err.toJSON().message).toBe("Custom auth message");
  });

  it("fallback sur defaultMessage du catalogue si pas d'override", () => {
    vi.stubEnv("NODE_ENV", "test");
    const err = new UnauthorizedError({ code: "SPX-LIC-001" });

    expect(err.toJSON().message).toBe("Session expirée ou inexistante");
  });
});
