// ==============================================================================
// @s2m-lic/shared — barrel export
//
// Source de vérité des contrats UI ↔ serveur (Référentiel §3 + ADR 0001).
// Importé par app/ via l'alias TS `@/shared/...` (cf. app/tsconfig.json).
// ==============================================================================

// --- Catalogue erreurs typées (F-03) ---------------------------------------
export { ERROR_CATALOGUE, isAppError } from "./constants/error-codes";
export type {
  AppErrorShape,
  ErrorClassName,
  ErrorCode,
  ErrorCodeEntry,
} from "./constants/error-codes";

// --- Identité SYSTEM (F-06) ------------------------------------------------
export {
  SYSTEM_USER_DISPLAY,
  SYSTEM_USER_ID,
  SYSTEM_USER_MATRICULE,
} from "./constants/system-user";

// --- Schémas auth (F-07) ----------------------------------------------------
export { ChangePasswordSchema, LoginSchema } from "./schemas/auth.schema";
export type { ChangePasswordInput, LoginInput } from "./schemas/auth.schema";
