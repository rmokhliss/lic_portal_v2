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

import { UpdateRenouvellementSchema } from "@s2m-lic/shared";

import { updateRenouvellementUseCase } from "@/server/composition-root";

export async function updateRenouvellementAction(input: unknown, ctx: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = UpdateRenouvellementSchema.parse(input);
  const { licenceId } = LicenceIdSchema.parse(ctx);
  const result = await updateRenouvellementUseCase.execute(
    {
      renouvellementId: parsed.renouvellementId,
      ...(parsed.nouvelleDateDebut !== undefined
        ? { nouvelleDateDebut: new Date(parsed.nouvelleDateDebut) }
        : {}),
      ...(parsed.nouvelleDateFin !== undefined
        ? { nouvelleDateFin: new Date(parsed.nouvelleDateFin) }
        : {}),
      ...("commentaire" in parsed ? { commentaire: parsed.commentaire } : {}),
    },
    actor.id,
  );
  revalidatePath(pathFor(licenceId, "renouvellements"));
  return result;
}

// ============================================================================
// Phase 10.C — Génération fichier .lic (stub PKI, signature RSA Phase 3)
// ============================================================================

import { generateLicenceFichierUseCase, importHealthcheckUseCase } from "@/server/composition-root";

export async function generateLicenceFichierAction(input: unknown): Promise<{
  contentJson: string;
  hash: string;
  filename: string;
}> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = LicenceIdSchema.parse(input);
  const result = await generateLicenceFichierUseCase.execute(
    { licenceId: parsed.licenceId },
    actor.id,
  );
  revalidatePath(pathFor(parsed.licenceId, "resume"));
  return {
    contentJson: result.contentJson,
    hash: result.hash,
    filename: `${result.content.reference}.lic`,
  };
}

const ImportHealthcheckSchema = z
  .object({
    licenceId: z.uuid(),
    filename: z.string().min(1).max(200),
    content: z.string().min(1).max(5_000_000), // cap 5MB texte
  })
  .strict();

export async function importHealthcheckAction(input: unknown): Promise<{
  updated: number;
  errors: number;
  errorDetails: readonly string[];
}> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ImportHealthcheckSchema.parse(input);
  const result = await importHealthcheckUseCase.execute(parsed, actor.id);
  revalidatePath(pathFor(parsed.licenceId, "resume"));
  revalidatePath(`/licences/${parsed.licenceId}/articles`);
  return {
    updated: result.updated,
    errors: result.errors,
    errorDetails: result.errorDetails,
  };
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

// ============================================================================
// Phase 7.B — Historique licence (audit-query scope)
// ============================================================================

import { listAuditByLicenceScopeUseCase } from "@/server/composition-root";

const LicenceHistoriqueQuerySchema = z
  .object({
    licenceId: z.uuid(),
    cursor: z.string().max(200).optional(),
    action: z.string().max(40).optional(),
    acteur: z.string().max(200).optional(),
  })
  .strict();

export async function fetchLicenceHistoriqueAction(input: unknown) {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = LicenceHistoriqueQuerySchema.parse(input);
  return listAuditByLicenceScopeUseCase.execute({
    licenceId: parsed.licenceId,
    filters: {
      ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
      ...(parsed.action !== undefined ? { action: parsed.action } : {}),
      ...(parsed.acteur !== undefined ? { userDisplayLike: parsed.acteur } : {}),
      limit: 50,
    },
  });
}
