// ==============================================================================
// LIC v2 — Server Actions /licences/[id] (Phase 5 étape 5.F + Phase 23 R-45)
//
// Pattern Result tagué (cf. /server/infrastructure/actions/result.ts) — toute
// erreur AppError métier remontée par les use-cases est convertie en
// `{ success: false, error, code }` au lieu d'être throwée (sinon Next.js 16
// sanitise le message côté client).
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AddArticleToLicenceSchema,
  AddProduitToLicenceSchema,
  AnnulerRenouvellementSchema,
  ChangeLicenceStatusSchema,
  CreateRenouvellementSchema,
  RemoveLiaisonSchema,
  UpdateArticleVolumeSchema,
  UpdateLicenceSchema,
  UpdateRenouvellementSchema,
  ValiderRenouvellementSchema,
} from "@s2m-lic/shared";

import { requireRole } from "@/server/infrastructure/auth";
import { env } from "@/server/infrastructure/env";
import {
  addArticleToLicenceUseCase,
  addProduitToLicenceUseCase,
  annulerRenouvellementUseCase,
  changeLicenceStatusUseCase,
  createRenouvellementUseCase,
  generateLicenceFichierUseCase,
  importHealthcheckUseCase,
  listAuditByLicenceScopeUseCase,
  removeArticleFromLicenceUseCase,
  removeProduitFromLicenceUseCase,
  updateArticleVolumeUseCase,
  updateLicenceUseCase,
  updateRenouvellementUseCase,
  validerRenouvellementUseCase,
} from "@/server/composition-root";
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";

const LicenceIdSchema = z.object({ licenceId: z.uuid() });

function pathFor(licenceId: string, tab: "resume" | "renouvellements"): string {
  return `/licences/${licenceId}/${tab}`;
}

// --- Licence : update + changeStatus ----------------------------------------

export async function updateLicenceAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateLicenceUseCase.execute>>>> {
  return runAction(async () => {
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
  });
}

export async function changeLicenceStatusAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof changeLicenceStatusUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = ChangeLicenceStatusSchema.parse(input);
    const result = await changeLicenceStatusUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(parsed.licenceId, "resume"));
    return result;
  });
}

// --- Renouvellements --------------------------------------------------------

export async function createRenouvellementAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createRenouvellementUseCase.execute>>>> {
  return runAction(async () => {
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
  });
}

export async function validerRenouvellementAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof validerRenouvellementUseCase.execute>>>> {
  return runAction(async () => {
    // SADMIN-only : validation engage le renouvellement et bumpe les dates de
    // la licence. ADMIN initie (create/edit), SADMIN valide.
    const actor = await requireRole(["SADMIN"]);
    const parsed = ValiderRenouvellementSchema.parse(input);
    const { licenceId } = LicenceIdSchema.parse(ctx);
    const result = await validerRenouvellementUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(licenceId, "renouvellements"));
    return result;
  });
}

export async function annulerRenouvellementAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof annulerRenouvellementUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = AnnulerRenouvellementSchema.parse(input);
    const { licenceId } = LicenceIdSchema.parse(ctx);
    const result = await annulerRenouvellementUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(licenceId, "renouvellements"));
    return result;
  });
}

export async function updateRenouvellementAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateRenouvellementUseCase.execute>>>> {
  return runAction(async () => {
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
  });
}

// ============================================================================
// Phase 10.C + Phase 14 — Génération fichier .lic (PKI bouclage, DETTE-LIC-008)
// ============================================================================

export async function generateLicenceFichierAction(input: unknown): Promise<
  ActionResult<{
    /** Payload .lic complet : JSON + signature + cert client (ADR-0002 + 0019). */
    contentJson: string;
    hash: string;
    filename: string;
  }>
> {
  return runAction(async () => {
    // SADMIN-only : émission d'un fichier .lic = workflow PKI signé. ADMIN
    // gère la création/édition de la licence mais pas l'émission du fichier.
    const actor = await requireRole(["SADMIN"]);
    const parsed = LicenceIdSchema.parse(input);
    const result = await generateLicenceFichierUseCase.execute(
      { licenceId: parsed.licenceId },
      actor.id,
      { appMasterKey: env.APP_MASTER_KEY },
    );
    revalidatePath(pathFor(parsed.licenceId, "resume"));
    return {
      contentJson: result.signedPayload,
      hash: result.hash,
      filename: `${result.content.reference}.lic`,
    };
  });
}

const ImportHealthcheckSchema = z
  .object({
    licenceId: z.uuid(),
    filename: z.string().min(1).max(200),
    content: z.string().min(1).max(5_000_000), // cap 5MB texte
  })
  .strict();

export async function importHealthcheckAction(input: unknown): Promise<
  ActionResult<{
    updated: number;
    errors: number;
    errorDetails: readonly string[];
    articlesSkipped: readonly string[];
    articlesOutOfContract: readonly string[];
    articlesNotInCatalog: readonly string[];
    referenceMatch: boolean | null;
  }>
> {
  return runAction(async () => {
    // SADMIN-only : import .hc = ingestion d'un fichier signé client (PKI).
    const actor = await requireRole(["SADMIN"]);
    const parsed = ImportHealthcheckSchema.parse(input);
    const result = await importHealthcheckUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(parsed.licenceId, "resume"));
    revalidatePath(`/licences/${parsed.licenceId}/articles`);
    return {
      updated: result.updated,
      errors: result.errors,
      errorDetails: result.errorDetails,
      articlesSkipped: result.articlesSkipped,
      articlesOutOfContract: result.articlesOutOfContract,
      articlesNotInCatalog: result.articlesNotInCatalog,
      referenceMatch: result.referenceMatch,
    };
  });
}

// ============================================================================
// Phase 6.F — Tab Articles : add/remove produit, add/update/remove article
// ============================================================================

export async function addProduitToLicenceAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof addProduitToLicenceUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = AddProduitToLicenceSchema.parse(input);
    const result = await addProduitToLicenceUseCase.execute(parsed, actor.id);
    revalidatePath(`/licences/${parsed.licenceId}/articles`);
    return result;
  });
}

export async function removeProduitFromLicenceAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = RemoveLiaisonSchema.parse(input);
    const { licenceId } = LicenceIdSchema.parse(ctx);
    await removeProduitFromLicenceUseCase.execute(parsed, actor.id);
    revalidatePath(`/licences/${licenceId}/articles`);
  });
}

export async function addArticleToLicenceAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof addArticleToLicenceUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = AddArticleToLicenceSchema.parse(input);
    const result = await addArticleToLicenceUseCase.execute(parsed, actor.id);
    revalidatePath(`/licences/${parsed.licenceId}/articles`);
    return result;
  });
}

export async function updateArticleVolumeAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateArticleVolumeUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = UpdateArticleVolumeSchema.parse(input);
    const { licenceId } = LicenceIdSchema.parse(ctx);
    const result = await updateArticleVolumeUseCase.execute(parsed, actor.id);
    revalidatePath(`/licences/${licenceId}/articles`);
    return result;
  });
}

export async function removeArticleFromLicenceAction(
  input: unknown,
  ctx: unknown,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = RemoveLiaisonSchema.parse(input);
    const { licenceId } = LicenceIdSchema.parse(ctx);
    await removeArticleFromLicenceUseCase.execute(parsed, actor.id);
    revalidatePath(`/licences/${licenceId}/articles`);
  });
}

// ============================================================================
// Phase 7.B — Historique licence (audit-query scope) — read-only
// ============================================================================

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
