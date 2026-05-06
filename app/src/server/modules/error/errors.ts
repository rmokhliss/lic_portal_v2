// ==============================================================================
// LIC v2 — Sous-classes concrètes d'AppError (Référentiel §4.2 + Phase 19+ fix)
//
// Chaque sous-classe fige son httpStatus + son `static typeName` littéral.
// La cohérence avec ERROR_CATALOGUE[code].className est validée dans le
// constructeur d'AppError (cf. app-error.ts) via `typeName` (et non
// `new.target.name`, qui est minifié par Turbopack/Webpack en build prod et
// déclenchait des faux positifs "Code X déclaré pour Y, levé depuis "[vide]"
// constatés sur la chaîne de création user — Phase 19+).
//
// Aucune sous-classe ne déclare de constructeur : elles héritent du constructeur
// public d'AppError. La classe abstraite empêche déjà l'instanciation directe
// d'AppError, donc `protected` sur le constructeur parent serait redondant.
// ==============================================================================

import { AppError } from "./app-error";

export class NotFoundError extends AppError {
  static override readonly typeName = "NotFoundError";
  readonly httpStatus = 404;
}

export class ValidationError extends AppError {
  static override readonly typeName = "ValidationError";
  readonly httpStatus = 400;
}

export class UnauthorizedError extends AppError {
  static override readonly typeName = "UnauthorizedError";
  readonly httpStatus = 401;
}

export class ForbiddenError extends AppError {
  static override readonly typeName = "ForbiddenError";
  readonly httpStatus = 403;
}

export class ConflictError extends AppError {
  static override readonly typeName = "ConflictError";
  readonly httpStatus = 409;
}

export class RateLimitError extends AppError {
  static override readonly typeName = "RateLimitError";
  readonly httpStatus = 429;
}

export class InternalError extends AppError {
  static override readonly typeName = "InternalError";
  readonly httpStatus = 500;
}
