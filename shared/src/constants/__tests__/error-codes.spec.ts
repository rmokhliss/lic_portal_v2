import { describe, expect, it } from "vitest";

import { ERROR_CATALOGUE, isAppError, type ErrorClassName, type ErrorCode } from "../error-codes";

const ALLOWED_HTTP = new Set<number>([400, 401, 403, 404, 409, 429, 500]);
const EXPECTED_HTTP_BY_CLASS: Readonly<Record<ErrorClassName, number>> = {
  NotFoundError: 404,
  ValidationError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  ConflictError: 409,
  RateLimitError: 429,
  InternalError: 500,
};

describe("ERROR_CATALOGUE", () => {
  it("each entry's code matches its key", () => {
    for (const [key, entry] of Object.entries(ERROR_CATALOGUE)) {
      expect(entry.code).toBe(key);
    }
  });

  it("each entry has a valid HTTP status", () => {
    for (const entry of Object.values(ERROR_CATALOGUE)) {
      expect(ALLOWED_HTTP.has(entry.httpStatus)).toBe(true);
    }
  });

  it("each entry has a non-empty French defaultMessage", () => {
    for (const entry of Object.values(ERROR_CATALOGUE)) {
      expect(entry.defaultMessage.length).toBeGreaterThan(0);
    }
  });

  it("className ↔ httpStatus consistent (NotFoundError → 404, etc.)", () => {
    for (const entry of Object.values(ERROR_CATALOGUE)) {
      expect(entry.httpStatus).toBe(EXPECTED_HTTP_BY_CLASS[entry.className]);
    }
  });
});

describe("isAppError", () => {
  it("returns true for a valid duck-typed AppErrorShape (without details)", () => {
    const shape = {
      __isAppError: true as const,
      code: "SPX-LIC-902" satisfies ErrorCode,
      httpStatus: 404,
      message: "test",
    };
    expect(isAppError(shape)).toBe(true);
  });

  it("returns true with optional details", () => {
    const shape = {
      __isAppError: true as const,
      code: "SPX-LIC-902" satisfies ErrorCode,
      httpStatus: 404,
      message: "test",
      details: { foo: "bar" },
    };
    expect(isAppError(shape)).toBe(true);
  });

  it.each<readonly [string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ["string primitive", "boom"],
    ["number primitive", 42],
    ["empty object", {}],
    [
      "__isAppError === false",
      { __isAppError: false, code: "SPX-LIC-902", httpStatus: 404, message: "x" },
    ],
    ["__isAppError missing", { code: "SPX-LIC-902", httpStatus: 404, message: "x" }],
    ["code not a string", { __isAppError: true, code: 1, httpStatus: 404, message: "x" }],
    [
      "httpStatus not a number",
      { __isAppError: true, code: "SPX-LIC-902", httpStatus: "404", message: "x" },
    ],
    ["message missing", { __isAppError: true, code: "SPX-LIC-902", httpStatus: 404 }],
  ])("returns false for %s", (_label, value) => {
    expect(isAppError(value)).toBe(false);
  });

  it("returns false for a plain Error instance (no __isAppError marker)", () => {
    // eslint-disable-next-line no-restricted-syntax -- test fixture : on vérifie justement qu'un Error nu n'est pas pris pour un AppError
    expect(isAppError(new Error("plain"))).toBe(false);
  });
});
