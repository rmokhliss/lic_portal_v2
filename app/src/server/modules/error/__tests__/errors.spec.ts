import { describe, expect, it } from "vitest";

import { isAppError, type ErrorCode } from "@s2m-lic/shared/constants/error-codes";

import { AppError } from "../app-error";
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "../errors";

interface ErrorClassCase {
  readonly Class: new (opts: { code: ErrorCode }) => AppError;
  readonly className: string;
  readonly httpStatus: number;
  readonly code: ErrorCode;
  readonly defaultMessage: string;
}

const CASES: readonly ErrorClassCase[] = [
  {
    Class: NotFoundError,
    className: "NotFoundError",
    httpStatus: 404,
    code: "SPX-LIC-902",
    defaultMessage: "Ressource introuvable",
  },
  {
    Class: ValidationError,
    className: "ValidationError",
    httpStatus: 400,
    code: "SPX-LIC-901",
    defaultMessage: "Données fournies invalides",
  },
  {
    Class: UnauthorizedError,
    className: "UnauthorizedError",
    httpStatus: 401,
    code: "SPX-LIC-001",
    defaultMessage: "Session expirée ou inexistante",
  },
  {
    Class: ForbiddenError,
    className: "ForbiddenError",
    httpStatus: 403,
    code: "SPX-LIC-003",
    defaultMessage: "Rôle insuffisant pour cette action",
  },
  {
    Class: ConflictError,
    className: "ConflictError",
    httpStatus: 409,
    code: "SPX-LIC-903",
    defaultMessage: "Conflit détecté avec l'état actuel de la ressource",
  },
  {
    Class: RateLimitError,
    className: "RateLimitError",
    httpStatus: 429,
    code: "SPX-LIC-904",
    defaultMessage: "Trop de requêtes, veuillez réessayer plus tard",
  },
  {
    Class: InternalError,
    className: "InternalError",
    httpStatus: 500,
    code: "SPX-LIC-900",
    defaultMessage: "Erreur interne du serveur",
  },
];

describe.each(CASES)("$className", ({ Class, className, httpStatus, code, defaultMessage }) => {
  it("a le httpStatus attendu", () => {
    const err = new Class({ code });
    expect(err.httpStatus).toBe(httpStatus);
  });

  it("a name === className", () => {
    const err = new Class({ code });
    expect(err.name).toBe(className);
  });

  it("a code === code seedé", () => {
    const err = new Class({ code });
    expect(err.code).toBe(code);
  });

  it("a message === defaultMessage du catalogue", () => {
    const err = new Class({ code });
    expect(err.message).toBe(defaultMessage);
  });

  it("est instance d'AppError ET de Error", () => {
    const err = new Class({ code });
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it("expose __isAppError === true", () => {
    const err = new Class({ code });
    expect(err.__isAppError).toBe(true);
  });

  it("est reconnu par isAppError()", () => {
    const err = new Class({ code });
    expect(isAppError(err)).toBe(true);
  });
});
