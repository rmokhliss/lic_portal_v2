// ==============================================================================
// LIC v2 — Server Actions /batches (Phase 8.D, EC-12)
// Lance manuellement un job (declencheur=MANUAL).
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { runJobNow, KNOWN_JOB_CODES } from "@/server/jobs/run-job-now";

const RunJobSchema = z.object({ jobCode: z.enum(KNOWN_JOB_CODES as [string, ...string[]]) });

export async function runJobNowAction(input: unknown): Promise<{ ok: true }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const { jobCode } = RunJobSchema.parse(input);
  await runJobNow(jobCode);
  revalidatePath("/batches");
  return { ok: true };
}
