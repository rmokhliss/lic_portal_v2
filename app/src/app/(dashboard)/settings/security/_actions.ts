// ==============================================================================
// LIC v2 — Server Actions /settings/security (Phase 3.C)
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { env } from "@/server/infrastructure/env";
import {
  generateCAUseCase,
  getCACertificateUseCase,
  getCAStatusUseCase,
} from "@/server/composition-root";
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";

const GenerateCASchema = z.object({
  subjectCN: z.string().trim().min(3).max(100).default("S2M Root CA"),
  org: z.string().trim().min(1).max(100).default("S2M"),
  validityYears: z.number().int().min(1).max(30).optional(),
});

export interface CAStatusActionOutput {
  exists: boolean;
  expiresAt: string | null;
  subjectCN: string | null;
  generatedAt: string | null;
}

export async function getCAStatusAction(): Promise<CAStatusActionOutput> {
  await requireRole(["SADMIN"]);
  const status = await getCAStatusUseCase.execute();
  return {
    exists: status.exists,
    expiresAt: status.expiresAt?.toISOString() ?? null,
    subjectCN: status.subjectCN,
    generatedAt: status.generatedAt?.toISOString() ?? null,
  };
}

export async function generateCAAction(input: unknown): Promise<
  ActionResult<{
    certificatePem: string;
    expiresAt: string;
    subjectCN: string;
  }>
> {
  return runAction(async () => {
    const user = await requireRole(["SADMIN"]);
    const parsed = GenerateCASchema.parse(input);
    const result = await generateCAUseCase.execute(
      { ...parsed, appMasterKey: env.APP_MASTER_KEY },
      user.id,
    );
    revalidatePath("/settings/security");
    return {
      certificatePem: result.certificatePem,
      expiresAt: result.expiresAt.toISOString(),
      subjectCN: result.subjectCN,
    };
  });
}

/** Retourne le PEM clair de la CA — utilisé par le bouton "Télécharger" SADMIN. */
export async function downloadCACertAction(): Promise<string> {
  await requireRole(["SADMIN"]);
  return await getCACertificateUseCase.execute();
}

// =============================================================================
// Phase 3.E — Backfill clients sans certificat
// =============================================================================

import { backfillClientCertificatesUseCase } from "@/server/composition-root";
import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

export interface BackfillStatusOutput {
  pendingCount: number;
}

export async function getBackfillStatusAction(): Promise<BackfillStatusOutput> {
  await requireRole(["SADMIN"]);
  const pendingCount = await backfillClientCertificatesUseCase.countPending();
  return { pendingCount };
}

export interface BackfillResultOutput {
  processed: number;
  failed: number;
  failures: readonly { codeClient: string; error: string }[];
}

export async function backfillClientCertsAction(): Promise<ActionResult<BackfillResultOutput>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const result = await backfillClientCertificatesUseCase.execute({
      appMasterKey: env.APP_MASTER_KEY,
      systemUserId: SYSTEM_USER_ID,
      systemUserDisplay: SYSTEM_USER_DISPLAY,
    });
    revalidatePath("/settings/security");
    return {
      processed: result.processed,
      failed: result.failed.length,
      failures: result.failed.map((f) => ({ codeClient: f.codeClient, error: f.error })),
    };
  });
}

// =============================================================================
// Phase 3.G — Toggle expose_s2m_ca_public (endpoint /.well-known/s2m-ca.pem)
// =============================================================================

import { updateSettingsUseCase } from "@/server/composition-root";
import { settingRepository } from "@/server/modules/settings/settings.module";

const EXPOSE_KEY = "expose_s2m_ca_public";

export async function getExposeS2mCaPublicAction(): Promise<boolean> {
  await requireRole(["SADMIN"]);
  const settings = await settingRepository.findAll();
  const setting = settings.find((s) => s.key === EXPOSE_KEY);
  return setting?.value === true;
}

export async function setExposeS2mCaPublicAction(value: boolean): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = await requireRole(["SADMIN"]);
    await updateSettingsUseCase.execute({
      entries: { [EXPOSE_KEY]: value },
      updatedBy: user.id,
    });
    revalidatePath("/settings/security");
  });
}

// =============================================================================
// Phase 23 — exposition cle AES-256 partagee healthcheck (.hc)
// =============================================================================
//
// Cle generee au seed bootstrap (cf. seedSettings ligne 401), stockee dans
// `lic_settings.healthcheck_shared_aes_key` (base64). C'est la meme cle qui
// est utilisee :
//  - cote banque cliente : pour chiffrer le .hc avant envoi
//  - cote S2M (LIC portal) : pour dechiffrer a l'import + verifier signature
//
// Le SADMIN doit pouvoir afficher cette cle pour la transmettre a la banque
// par canal securise (1 fois a l'integration). Pas de mutation cote UI —
// la regeneration passe par un script CLI (preserve la coherence avec les
// .hc deja chiffres en attente de traitement).

const HEALTHCHECK_KEY_KEY = "healthcheck_shared_aes_key";

export async function getHealthcheckSharedKeyAction(): Promise<ActionResult<string>> {
  return runAction(async () => {
    await requireRole(["SADMIN"]);
    const settings = await settingRepository.findAll();
    const setting = settings.find((s) => s.key === HEALTHCHECK_KEY_KEY);
    if (setting === undefined || typeof setting.value !== "string") {
      return "";
    }
    return setting.value;
  });
}
