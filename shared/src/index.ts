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
