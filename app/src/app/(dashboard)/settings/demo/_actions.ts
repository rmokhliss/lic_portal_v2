// ==============================================================================
// LIC v2 — Server Actions /settings/demo (Phase 17 F2)
//
// Outils SADMIN — purge/reload données démo. Audit DEMO_PURGED + DEMO_RELOADED
// avec mode MANUEL (audit modes valides : MANUEL/API/JOB/SEED/SCRIPT — pas
// de mode SADMIN, l'identité de l'acteur est tracée via userId/userDisplay).
// Guard SADMIN strict via requireRole.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/server/infrastructure/auth";
import { getDemoStats, type DemoStats } from "@/server/infrastructure/demo/get-demo-stats";
import { purgeDemoData } from "@/server/infrastructure/demo/purge-demo";
import { reloadDemoData } from "@/server/infrastructure/demo/reload-demo";
import { recordAuditEntryUseCase } from "@/server/composition-root";

async function recordDemoAudit(
  action: "DEMO_PURGED" | "DEMO_RELOADED",
  userId: string,
  userDisplay: string,
  beforeStats: DemoStats,
  afterStats: DemoStats,
): Promise<void> {
  // Best-effort : un échec d'audit ne doit pas bloquer la maintenance démo.
  try {
    await recordAuditEntryUseCase.execute({
      entity: "demo",
      entityId: userId, // pas d'entityId métier — on prend l'acteur par défaut
      action,
      beforeData: { ...beforeStats },
      afterData: { ...afterStats },
      userId,
      userDisplay,
      mode: "MANUEL",
    });
  } catch {
    // Silencieux — les compteurs sont déjà visibles côté UI.
  }
}

export async function purgeDemoAction(): Promise<void> {
  const user = await requireRole(["SADMIN"]);
  const before = await getDemoStats();
  await purgeDemoData();
  const after = await getDemoStats();
  await recordDemoAudit("DEMO_PURGED", user.id, user.display, before, after);
  revalidatePath("/settings/demo");
}

export async function reloadDemoAction(): Promise<void> {
  const user = await requireRole(["SADMIN"]);
  const before = await getDemoStats();
  await reloadDemoData();
  const after = await getDemoStats();
  await recordDemoAudit("DEMO_RELOADED", user.id, user.display, before, after);
  revalidatePath("/settings/demo");
}
