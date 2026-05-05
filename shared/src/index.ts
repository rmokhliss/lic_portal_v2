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

// --- Schémas client EC-Clients (Phase 4.B + Phase 14 contacts à création) --
export {
  ChangeClientStatusSchema,
  ContactInputSchema,
  CreateClientSchema,
  UpdateClientSchema,
} from "./schemas/client.schema";
export type {
  ChangeClientStatusInput,
  ClientStatutInput,
  ContactInput,
  CreateClientInput,
  UpdateClientInput,
} from "./schemas/client.schema";

// --- Schémas entite + contact EC-Clients (Phase 4.C) -----------------------
export {
  CreateEntiteSchema,
  ToggleEntiteActiveSchema,
  UpdateEntiteSchema,
} from "./schemas/entite.schema";
export type {
  CreateEntiteInput,
  ToggleEntiteActiveInput,
  UpdateEntiteInput,
} from "./schemas/entite.schema";
export {
  CreateContactSchema,
  DeleteContactSchema,
  UpdateContactSchema,
} from "./schemas/contact.schema";
export type {
  CreateContactInput,
  DeleteContactInput,
  UpdateContactInput,
} from "./schemas/contact.schema";

// --- Schémas licence Phase 5 ------------------------------------------------
export {
  ChangeLicenceStatusSchema,
  CreateLicenceSchema,
  UpdateLicenceSchema,
} from "./schemas/licence.schema";
export type {
  ChangeLicenceStatusInput,
  CreateLicenceInput,
  LicenceStatusInput,
  UpdateLicenceInput,
} from "./schemas/licence.schema";

// --- Schémas renouvellement Phase 5 + Phase 9.A update ----------------------
export {
  AnnulerRenouvellementSchema,
  CreateRenouvellementSchema,
  UpdateRenouvellementSchema,
  ValiderRenouvellementSchema,
} from "./schemas/renouvellement.schema";
export type {
  AnnulerRenouvellementInput,
  CreateRenouvellementInput,
  RenewStatusInput,
  UpdateRenouvellementInput,
  ValiderRenouvellementInput,
} from "./schemas/renouvellement.schema";

// --- Schémas catalogue Phase 6 ----------------------------------------------
export {
  AddArticleToLicenceSchema,
  AddProduitToLicenceSchema,
  CreateArticleSchema,
  CreateProduitSchema,
  RemoveLiaisonSchema,
  ToggleArticleSchema,
  ToggleProduitSchema,
  UpdateArticleSchema,
  UpdateArticleVolumeSchema,
  UpdateProduitSchema,
} from "./schemas/produit.schema";
export type {
  AddArticleToLicenceInput,
  AddProduitToLicenceInput,
  CreateArticleInput,
  CreateProduitInput,
  RemoveLiaisonInput,
  ToggleArticleInput,
  ToggleProduitInput,
  UpdateArticleInput,
  UpdateArticleVolumeInput,
  UpdateProduitInput,
} from "./schemas/produit.schema";
