// ==============================================================================
// LIC v2 — Server Actions /settings (Phase 2.B étape 7/7)
//
// Toutes les Server Actions des onglets /settings/* — agrégées ici car le
// layout est commun (garde SADMIN unique, revalidatePath sur /settings/<tab>).
//
// Pattern strict (CLAUDE.md §2 + Référentiel §4.12.4 adapté Next.js) :
//   1. requireRole(["SADMIN"])
//   2. Schema.parse(input)
//   3. await useCase.execute(parsed)
//   4. revalidatePath(...)
//
// Pas d'audit cross-module (R-27 — référentiels paramétrables + table
// settings technique). updated_by est posé via session.user.id pour settings.
// Les use-cases toggle prennent un primitif (string code OU number id pour
// team_members PK serial).
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CreateUserSchema, SettingsGeneralSchema, UpdateUserSchema } from "@s2m-lic/shared";

import { requireRole } from "@/server/infrastructure/auth";
import { createChildLogger } from "@/server/infrastructure/logger";
import {
  createDeviseUseCase,
  createLangueUseCase,
  createPaysUseCase,
  createRegionUseCase,
  createTeamMemberUseCase,
  createTypeContactUseCase,
  createUserUseCase,
  resetUserPasswordUseCase,
  toggleDeviseUseCase,
  toggleLangueUseCase,
  togglePaysUseCase,
  toggleRegionUseCase,
  toggleTeamMemberUseCase,
  toggleTypeContactUseCase,
  toggleUserActiveUseCase,
  updateSettingsUseCase,
  updateUserUseCase,
} from "@/server/composition-root";

const userActionsLogger = createChildLogger("settings/users");

// --- Onglet general ---------------------------------------------------------

export async function updateGeneralSettingsAction(input: unknown): Promise<void> {
  const user = await requireRole(["SADMIN"]);
  const parsed = SettingsGeneralSchema.parse(input);
  await updateSettingsUseCase.execute({ entries: parsed, updatedBy: user.id });
  revalidatePath("/settings/general");
}

// --- Onglet team — schémas formulaires --------------------------------------

const RegionFormSchema = z.object({
  regionCode: z.string().min(1).max(50),
  nom: z.string().min(1).max(100),
  dmResponsable: z.string().max(100).optional(),
});

const PaysFormSchema = z.object({
  codePays: z.string().length(2),
  nom: z.string().min(1).max(100),
  regionCode: z.string().min(1).max(50).optional(),
});

const DeviseFormSchema = z.object({
  codeDevise: z.string().length(3),
  nom: z.string().min(1).max(100),
  symbole: z.string().min(1).max(10),
});

const LangueFormSchema = z.object({
  codeLangue: z.string().length(2),
  nom: z.string().min(1).max(100),
});

const TypeContactFormSchema = z.object({
  code: z.string().min(1).max(50),
  libelle: z.string().min(1).max(100),
});

const TeamMemberFormSchema = z.object({
  nom: z.string().min(1).max(100),
  prenom: z.string().min(1).max(100),
  email: z.email().max(150),
  roleTeam: z.enum(["SALES", "AM", "DM"]),
  regionCode: z.string().min(1).max(50).optional(),
});

// --- Onglet team — création (6) --------------------------------------------

export async function createRegionAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = RegionFormSchema.parse(input);
  await createRegionUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

export async function createPaysAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = PaysFormSchema.parse(input);
  await createPaysUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

export async function createDeviseAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = DeviseFormSchema.parse(input);
  await createDeviseUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

export async function createLangueAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = LangueFormSchema.parse(input);
  await createLangueUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

export async function createTypeContactAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = TypeContactFormSchema.parse(input);
  await createTypeContactUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

export async function createTeamMemberAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const parsed = TeamMemberFormSchema.parse(input);
  await createTeamMemberUseCase.execute(parsed);
  revalidatePath("/settings/team");
}

// --- Onglet team — toggle actif (6) ----------------------------------------
// Les toggle use-cases prennent un primitif (string code OU number id).

export async function toggleRegionAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { regionCode } = z.object({ regionCode: z.string().min(1) }).parse(input);
  await toggleRegionUseCase.execute(regionCode);
  revalidatePath("/settings/team");
}

export async function togglePaysAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { codePays } = z.object({ codePays: z.string().length(2) }).parse(input);
  await togglePaysUseCase.execute(codePays);
  revalidatePath("/settings/team");
}

export async function toggleDeviseAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { codeDevise } = z.object({ codeDevise: z.string().length(3) }).parse(input);
  await toggleDeviseUseCase.execute(codeDevise);
  revalidatePath("/settings/team");
}

export async function toggleLangueAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { codeLangue } = z.object({ codeLangue: z.string().length(2) }).parse(input);
  await toggleLangueUseCase.execute(codeLangue);
  revalidatePath("/settings/team");
}

export async function toggleTypeContactAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { code } = z.object({ code: z.string().min(1) }).parse(input);
  await toggleTypeContactUseCase.execute(code);
  revalidatePath("/settings/team");
}

export async function toggleTeamMemberAction(input: unknown): Promise<void> {
  await requireRole(["SADMIN"]);
  const { id } = z.object({ id: z.number().int().positive() }).parse(input);
  await toggleTeamMemberUseCase.execute(id);
  revalidatePath("/settings/team");
}

// ============================================================================
// EC-08 Users — Phase 2.B.bis
// ============================================================================
//
// 4 Server Actions back-office utilisateurs. Toutes garde SADMIN (règle L11
// — doublée par le requireRolePage du settings/layout.tsx).
// Les use-cases retournent UserDTO (toDTO appliqué dans application/), pas
// d'entité — type-safe sur le wire Server Action ↔ Client Component.
//
// Log Pino { event: "user_password_to_communicate" } posé ICI (côté action,
// pas côté use-case — règle Stop 4) après création / reset, pour traçabilité
// du flow MDP transitoire (en attendant la Phase 8 qui introduira l'envoi
// email réel).
//
// Erreurs use-case (SPX-LIC-720..723) propagées telles quelles ; le caller
// UI (Client Component) les attrape et les affiche.

const UserIdSchema = z.object({ userId: z.uuid() });

export async function createUserAction(input: unknown) {
  const actor = await requireRole(["SADMIN"]);
  const parsed = CreateUserSchema.parse(input);
  const result = await createUserUseCase.execute(parsed, actor.id);
  userActionsLogger.info(
    {
      event: "user_password_to_communicate",
      userId: result.user.id,
      email: result.user.email,
      actorId: actor.id,
      reason: "admin_create",
    },
    "Mot de passe utilisateur à transmettre par canal sécurisé",
  );
  revalidatePath("/settings/users");
  return result;
}

export async function updateUserAction(input: unknown) {
  const actor = await requireRole(["SADMIN"]);
  const parsed = UpdateUserSchema.parse(input);
  const { userId, ...patch } = parsed;
  const result = await updateUserUseCase.execute({ userId, ...patch }, actor.id);
  revalidatePath("/settings/users");
  return result;
}

export async function toggleUserActiveAction(input: unknown) {
  const actor = await requireRole(["SADMIN"]);
  const { userId } = UserIdSchema.parse(input);
  const result = await toggleUserActiveUseCase.execute({ userId }, actor.id);
  revalidatePath("/settings/users");
  return result;
}

export async function resetUserPasswordAction(input: unknown) {
  const actor = await requireRole(["SADMIN"]);
  const { userId } = UserIdSchema.parse(input);
  const result = await resetUserPasswordUseCase.execute({ userId }, actor.id);
  userActionsLogger.info(
    {
      event: "user_password_to_communicate",
      userId: result.user.id,
      email: result.user.email,
      actorId: actor.id,
      reason: "admin_reset",
    },
    "Mot de passe utilisateur à transmettre par canal sécurisé",
  );
  revalidatePath("/settings/users");
  return result;
}
