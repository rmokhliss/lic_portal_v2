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
import { rateLimit } from "@/server/infrastructure/rate-limit/rate-limit";
import { createChildLogger } from "@/server/infrastructure/logger";
import {
  createDeviseUseCase,
  createLangueUseCase,
  createPaysUseCase,
  createRegionUseCase,
  createTeamMemberUseCase,
  createTypeContactUseCase,
  createUserUseCase,
  renderTemplateUseCase,
  resetUserPasswordUseCase,
  sendEmailUseCase,
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
import { env } from "@/server/infrastructure/env";

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
  // Phase 14 — best-effort welcome email. Échec n'invalide pas la création.
  await sendUserEmailBestEffort(
    "user-welcome",
    {
      prenom: result.user.prenom,
      email: result.user.email,
      motDePasseInitial: result.generatedPassword,
      urlConnexion: env.APP_URL,
    },
    result.user.email,
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
  // Phase 13.A — rate limit : 10 resets / minute / SADMIN. Bornage défensif
  // contre un mauvais usage (un SADMIN ne fait normalement pas plus de quelques
  // resets simultanés).
  rateLimit(`reset-password:${actor.id}`, 10, 60_000);
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
  // Phase 14 — best-effort password-reset email. Échec n'invalide pas le reset.
  await sendUserEmailBestEffort(
    "password-reset",
    {
      prenom: result.user.prenom,
      motDePasseTemp: result.newPassword,
      urlConnexion: env.APP_URL,
    },
    result.user.email,
  );
  revalidatePath("/settings/users");
  return result;
}

// Phase 14 — wrapper email best-effort. Toute erreur est loggée Pino mais ne
// remonte pas — l'envoi email ne doit pas casser la mutation principale
// (création / reset password). Le log Pino reste la source de vérité du flow
// MDP transitoire (cf. event "user_password_to_communicate").
async function sendUserEmailBestEffort(
  template: "user-welcome" | "password-reset",
  variables: Readonly<Record<string, string | number>>,
  to: string,
): Promise<void> {
  try {
    const rendered = renderTemplateUseCase.execute(template, variables);
    await sendEmailUseCase.execute({
      to,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
    });
  } catch (err) {
    userActionsLogger.warn(
      {
        event: "email_send_failed",
        template,
        to,
        error: err instanceof Error ? err.message : String(err),
      },
      "Échec envoi email user (best-effort, mutation OK)",
    );
  }
}

// ============================================================================
// Phase 6.F — onglet Catalogues : produits + articles (R-27 sans audit)
// ============================================================================

import {
  CreateArticleSchema,
  CreateProduitSchema,
  ToggleArticleSchema,
  ToggleProduitSchema,
  UpdateArticleSchema,
  UpdateProduitSchema,
} from "@s2m-lic/shared";

import {
  createArticleUseCase,
  createProduitUseCase,
  toggleArticleUseCase,
  toggleProduitUseCase,
  updateArticleUseCase,
  updateProduitUseCase,
} from "@/server/composition-root";

export async function createProduitAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const parsed = CreateProduitSchema.parse(input);
  const result = await createProduitUseCase.execute(parsed);
  revalidatePath("/settings/catalogues");
  return result;
}

export async function updateProduitAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const parsed = UpdateProduitSchema.parse(input);
  const result = await updateProduitUseCase.execute(parsed);
  revalidatePath("/settings/catalogues");
  return result;
}

export async function toggleProduitAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const { code } = ToggleProduitSchema.parse(input);
  const result = await toggleProduitUseCase.execute(code);
  revalidatePath("/settings/catalogues");
  return result;
}

export async function createArticleAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const parsed = CreateArticleSchema.parse(input);
  const result = await createArticleUseCase.execute(parsed);
  revalidatePath("/settings/catalogues");
  return result;
}

export async function updateArticleAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const parsed = UpdateArticleSchema.parse(input);
  const result = await updateArticleUseCase.execute(parsed);
  revalidatePath("/settings/catalogues");
  return result;
}

export async function toggleArticleAction(input: unknown) {
  await requireRole(["SADMIN"]);
  const { id } = ToggleArticleSchema.parse(input);
  const result = await toggleArticleUseCase.execute(id);
  revalidatePath("/settings/catalogues");
  return result;
}
