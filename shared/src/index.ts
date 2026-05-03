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

// --- Schémas settings (Phase 2.B étape 7/7) ---------------------------------
export { SETTINGS_GENERAL_KEYS, SettingsGeneralSchema } from "./schemas/settings.schema";
export type { SettingsGeneralInput, SettingsGeneralKey } from "./schemas/settings.schema";

// --- Schémas user EC-08 (Phase 2.B.bis) -------------------------------------
export { CreateUserSchema, UpdateUserSchema } from "./schemas/user.schema";
export type { CreateUserInput, UpdateUserInput, UserRoleInput } from "./schemas/user.schema";
