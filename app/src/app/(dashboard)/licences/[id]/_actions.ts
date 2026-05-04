// ==============================================================================
// LIC v2 — Server Actions /licences/[id] (Phase 5 étape 5.F)
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AnnulerRenouvellementSchema,
  ChangeLicenceStatusSchema,
  CreateRenouvellementSchema,
  UpdateLicenceSchema,
  ValiderRenouvellementSchema,
} from "@s2m-lic/shared";

import { requireRole } from "@/server/infrastructure/auth";
import {
  annulerRenouvellementUseCase,
  changeLicenceStatusUseCase,
  createRenouvellementUseCase,
  updateLicenceUseCase,
  validerRenouvellementUseCase,
} from "@/server/composition-root";

const LicenceIdSchema = z.object({ licenceId: z.uuid() });

function pathFor(licenceId: string, tab: "resume" | "renouvellements"): string {
  return `/licences/${licenceId}/${tab}`;
}

// --- Licence : update + changeStatus ----------------------------------------

export async function updateLicenceAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = UpdateLicenceSchema.parse(input);
  const result = await updateLicenceUseCase.execute(
    {
      licenceId: parsed.licenceId,
      expectedVersion: parsed.expectedVersion,
      ...(parsed.dateDebut !== undefined ? { dateDebut: new Date(parsed.dateDebut) } : {}),
      ...(parsed.dateFin !== undefined ? { dateFin: new Date(parsed.dateFin) } : {}),
      ...(parsed.commentaire !== undefined ? { commentaire: parsed.commentaire } : {}),
      ...(parsed.renouvellementAuto !== undefined
        ? { renouvellementAuto: parsed.renouvellementAuto }
        : {}),
    },
    actor.id,
  );
  revalidatePath(pathFor(parsed.licenceId, "resume"));
  return result;
}

export async function changeLicenceStatusAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ChangeLicenceStatusSchema.parse(input);
  const result = await changeLicenceStatusUseCase.execute(parsed, actor.id);
  revalidatePath(pathFor(parsed.licenceId, "resume"));
  return result;
}

// --- Renouvellements --------------------------------------------------------

export async function createRenouvellementAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = CreateRenouvellementSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  const result = await createRenouvellementUseCase.execute(
    {
      licenceId: parsed.licenceId,
      nouvelleDateDebut: new Date(parsed.nouvelleDateDebut),
      nouvelleDateFin: new Date(parsed.nouvelleDateFin),
      ...(parsed.commentaire !== undefined ? { commentaire: parsed.commentaire } : {}),
    },
    actor.id,
  );
  revalidatePath(pathFor(licenceId, "renouvellements"));
  return result;
}

export async function validerRenouvellementAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ValiderRenouvellementSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  const result = await validerRenouvellementUseCase.execute(parsed, actor.id);
  revalidatePath(pathFor(licenceId, "renouvellements"));
  return result;
}

export async function annulerRenouvellementAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = AnnulerRenouvellementSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  const result = await annulerRenouvellementUseCase.execute(parsed, actor.id);
  revalidatePath(pathFor(licenceId, "renouvellements"));
  return result;
}

// ============================================================================
// Phase 6.F — Tab Articles : add/remove produit, add/update/remove article
// ============================================================================

import {
  AddArticleToLicenceSchema,
  AddProduitToLicenceSchema,
  RemoveLiaisonSchema,
  UpdateArticleVolumeSchema,
} from "@s2m-lic/shared";

import {
  addArticleToLicenceUseCase,
  addProduitToLicenceUseCase,
  removeArticleFromLicenceUseCase,
  removeProduitFromLicenceUseCase,
  updateArticleVolumeUseCase,
} from "@/server/composition-root";

export async function addProduitToLicenceAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = AddProduitToLicenceSchema.parse(input);
  const result = await addProduitToLicenceUseCase.execute(parsed, actor.id);
  revalidatePath(`/licences/${parsed.licenceId}/articles`);
  return result;
}

export async function removeProduitFromLicenceAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = RemoveLiaisonSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  await removeProduitFromLicenceUseCase.execute(parsed, actor.id);
  revalidatePath(`/licences/${licenceId}/articles`);
}

export async function addArticleToLicenceAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = AddArticleToLicenceSchema.parse(input);
  const result = await addArticleToLicenceUseCase.execute(parsed, actor.id);
  revalidatePath(`/licences/${parsed.licenceId}/articles`);
  return result;
}

export async function updateArticleVolumeAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = UpdateArticleVolumeSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  const result = await updateArticleVolumeUseCase.execute(parsed, actor.id);
  revalidatePath(`/licences/${licenceId}/articles`);
  return result;
}

export async function removeArticleFromLicenceAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = RemoveLiaisonSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  await removeArticleFromLicenceUseCase.execute(parsed, actor.id);
  revalidatePath(`/licences/${licenceId}/articles`);
}
