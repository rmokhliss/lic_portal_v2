// ==============================================================================
// LIC v2 — Module error : barrel export
//
// Usage côté serveur :
//   import { NotFoundError, isAppError } from "@/server/modules/error";
//
// Côté UI / shared : importer directement isAppError depuis
//   "@/shared/constants/error-codes" — la classe AppError reste server-only.
// ==============================================================================

export { AppError } from "./app-error";
export type { AppErrorJSON, AppErrorOptions } from "./app-error";
export {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "./errors";

// Re-export depuis shared/ pour ergonomie : un seul import côté serveur
// donne accès à la fois aux classes et aux artefacts du catalogue.
export { ERROR_CATALOGUE, isAppError } from "@s2m-lic/shared/constants/error-codes";
export type {
  AppErrorShape,
  ErrorClassName,
  ErrorCode,
  ErrorCodeEntry,
} from "@s2m-lic/shared/constants/error-codes";
