// ==============================================================================
// LIC v2 — Server Actions /settings (Phase 2.B étape 7/7 + Phase 23 R-45)
//
// Toutes les Server Actions des onglets /settings/* — agrégées ici car le
// layout est commun (garde SADMIN unique, revalidatePath sur /settings/<tab>).
//
// Pattern Result tagué (Phase 23 R-45 — runAction) :
//   1. requireRole(["SADMIN"])
//   2. Schema.parse(input)
//   3. await useCase.execute(parsed)
//   4. revalidatePath / updateTag
//   5. Result tagué via runAction (catch AppError → success: false)
//
// Pas d'audit cross-module (R-27 — référentiels paramétrables + table
// settings technique). updated_by est posé via session.user.id pour settings.
// ==============================================================================

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

// Phase 22 R-44 — invalidation cache des référentiels (TTL 60s) après chaque
// mutation. Sans ces tags, les pages /clients, /licences, /renewals
// continueraient d'afficher l'ancienne liste pendant 60s post-mutation.
import {
  REFERENTIALS_TAG_DEVISES,
  REFERENTIALS_TAG_LANGUES,
  REFERENTIALS_TAG_PAYS,
  REFERENTIALS_TAG_REGIONS,
  REFERENTIALS_TAG_TEAM_MEMBERS,
} from "@/lib/cached-referentials";

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
  updateDeviseUseCase,
  updateLangueUseCase,
  updatePaysUseCase,
  updateRegionUseCase,
  updateSettingsUseCase,
  updateTeamMemberUseCase,
  updateTypeContactUseCase,
  updateUserUseCase,
} from "@/server/composition-root";
import { env } from "@/server/infrastructure/env";
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";

const userActionsLogger = createChildLogger("settings/users");

// --- Onglet general ---------------------------------------------------------

export async function updateGeneralSettingsAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = await requireRole(["SADMIN"]);
    const parsed = SettingsGeneralSchema.parse(input);
    await updateSettingsUseCase.execute({ entries: parsed, updatedBy: user.id });
    revalidatePath("/settings/general");
  });
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

export async function createRegionAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = RegionFormSchema.parse(input);
    await createRegionUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_REGIONS);
  });
}

export async function createPaysAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = PaysFormSchema.parse(input);
    await createPaysUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_PAYS);
  });
}

export async function createDeviseAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = DeviseFormSchema.parse(input);
    await createDeviseUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_DEVISES);
  });
}

export async function createLangueAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = LangueFormSchema.parse(input);
    await createLangueUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_LANGUES);
  });
}

export async function createTypeContactAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = TypeContactFormSchema.parse(input);
    await createTypeContactUseCase.execute(parsed);
    revalidatePath("/settings/team");
  });
}

export async function createTeamMemberAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = TeamMemberFormSchema.parse(input);
    await createTeamMemberUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_TEAM_MEMBERS);
  });
}

// --- Onglet team — update (6) — Phase 14 (DETTE-LIC-006 résolue) -----------

const UpdateRegionFormSchema = z.object({
  regionCode: z.string().min(1).max(50),
  nom: z.string().min(1).max(100).optional(),
  dmResponsable: z.string().max(100).nullable().optional(),
});

const UpdatePaysFormSchema = z.object({
  codePays: z.string().length(2),
  nom: z.string().min(1).max(100).optional(),
  regionCode: z.string().min(1).max(50).nullable().optional(),
});

const UpdateDeviseFormSchema = z.object({
  codeDevise: z.string().length(3),
  nom: z.string().min(1).max(100).optional(),
  symbole: z.string().min(1).max(10).nullable().optional(),
});

const UpdateLangueFormSchema = z.object({
  codeLangue: z.string().length(2),
  nom: z.string().min(1).max(100).optional(),
});

const UpdateTypeContactFormSchema = z.object({
  code: z.string().min(1).max(50),
  libelle: z.string().min(1).max(100).optional(),
});

const UpdateTeamMemberFormSchema = z.object({
  id: z.number().int().positive(),
  nom: z.string().min(1).max(100).optional(),
  prenom: z.string().min(1).max(100).nullable().optional(),
  email: z.email().max(150).nullable().optional(),
  telephone: z.string().max(50).nullable().optional(),
  roleTeam: z.enum(["SALES", "AM", "DM"]).optional(),
  regionCode: z.string().min(1).max(50).nullable().optional(),
});

export async function updateRegionAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateRegionFormSchema.parse(input);
    await updateRegionUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_REGIONS);
  });
}

export async function updatePaysAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdatePaysFormSchema.parse(input);
    await updatePaysUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_PAYS);
  });
}

export async function updateDeviseAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateDeviseFormSchema.parse(input);
    await updateDeviseUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_DEVISES);
  });
}

export async function updateLangueAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateLangueFormSchema.parse(input);
    await updateLangueUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_LANGUES);
  });
}

export async function updateTypeContactAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateTypeContactFormSchema.parse(input);
    await updateTypeContactUseCase.execute(parsed);
    revalidatePath("/settings/team");
  });
}

export async function updateTeamMemberAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateTeamMemberFormSchema.parse(input);
    await updateTeamMemberUseCase.execute(parsed);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_TEAM_MEMBERS);
  });
}

// --- Onglet team — toggle actif (6) ----------------------------------------

export async function toggleRegionAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { regionCode } = z.object({ regionCode: z.string().min(1) }).parse(input);
    await toggleRegionUseCase.execute(regionCode);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_REGIONS);
  });
}

export async function togglePaysAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { codePays } = z.object({ codePays: z.string().length(2) }).parse(input);
    await togglePaysUseCase.execute(codePays);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_PAYS);
  });
}

export async function toggleDeviseAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { codeDevise } = z.object({ codeDevise: z.string().length(3) }).parse(input);
    await toggleDeviseUseCase.execute(codeDevise);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_DEVISES);
  });
}

export async function toggleLangueAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { codeLangue } = z.object({ codeLangue: z.string().length(2) }).parse(input);
    await toggleLangueUseCase.execute(codeLangue);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_LANGUES);
  });
}

export async function toggleTypeContactAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { code } = z.object({ code: z.string().min(1) }).parse(input);
    await toggleTypeContactUseCase.execute(code);
    revalidatePath("/settings/team");
  });
}

export async function toggleTeamMemberAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { id } = z.object({ id: z.number().int().positive() }).parse(input);
    await toggleTeamMemberUseCase.execute(id);
    revalidatePath("/settings/team");
    updateTag(REFERENTIALS_TAG_TEAM_MEMBERS);
  });
}

// ============================================================================
// EC-08 Users — Phase 2.B.bis
// ============================================================================

const UserIdSchema = z.object({ userId: z.uuid() });

export async function createUserAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createUserUseCase.execute>>>> {
  return runAction(async () => {
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
  });
}

export async function updateUserAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateUserUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["SADMIN"]);
    const parsed = UpdateUserSchema.parse(input);
    const { userId, ...patch } = parsed;
    const result = await updateUserUseCase.execute({ userId, ...patch }, actor.id);
    revalidatePath("/settings/users");
    return result;
  });
}

export async function toggleUserActiveAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof toggleUserActiveUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["SADMIN"]);
    const { userId } = UserIdSchema.parse(input);
    const result = await toggleUserActiveUseCase.execute({ userId }, actor.id);
    revalidatePath("/settings/users");
    return result;
  });
}

export async function resetUserPasswordAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof resetUserPasswordUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["SADMIN"]);
    // Phase 13.A — rate limit : 10 resets / minute / SADMIN. Bornage défensif
    // contre un mauvais usage.
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
  });
}

// Phase 14 — wrapper email best-effort. Toute erreur est loggée Pino mais ne
// remonte pas — l'envoi email ne doit pas casser la mutation principale.
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

export async function createProduitAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createProduitUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = CreateProduitSchema.parse(input);
    const result = await createProduitUseCase.execute(parsed);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

export async function updateProduitAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateProduitUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateProduitSchema.parse(input);
    const result = await updateProduitUseCase.execute(parsed);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

export async function toggleProduitAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof toggleProduitUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { code } = ToggleProduitSchema.parse(input);
    const result = await toggleProduitUseCase.execute(code);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

export async function createArticleAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createArticleUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = CreateArticleSchema.parse(input);
    const result = await createArticleUseCase.execute(parsed);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

export async function updateArticleAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateArticleUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const parsed = UpdateArticleSchema.parse(input);
    const result = await updateArticleUseCase.execute(parsed);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

export async function toggleArticleAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof toggleArticleUseCase.execute>>>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { id } = ToggleArticleSchema.parse(input);
    const result = await toggleArticleUseCase.execute(id);
    revalidatePath("/settings/catalogues");
    return result;
  });
}

// Phase 23 — suppression dure produit/article si non utilisé en licence.

import { deleteArticleUseCase, deleteProduitUseCase } from "@/server/composition-root";

const DeleteProduitSchema = z.object({ code: z.string().min(1).max(30) }).strict();
const DeleteArticleSchema = z.object({ id: z.number().int().positive() }).strict();

export async function deleteProduitAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { code } = DeleteProduitSchema.parse(input);
    await deleteProduitUseCase.execute(code);
    revalidatePath("/settings/catalogues");
  });
}

export async function deleteArticleAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const { id } = DeleteArticleSchema.parse(input);
    await deleteArticleUseCase.execute(id);
    revalidatePath("/settings/catalogues");
  });
}
