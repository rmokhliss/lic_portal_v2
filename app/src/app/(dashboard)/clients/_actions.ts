// ==============================================================================
// LIC v2 — Server Actions /clients (Phase 4 étape 4.E)
//
// 3 actions mutateurs sur lic_clients. Pattern strict (CLAUDE.md §2 +
// Référentiel §4.12.4) :
//   1. requireRole(["ADMIN", "SADMIN"]) — USER en lecture seule (règle L11)
//   2. Schema.parse(input) — Zod strict
//   3. await useCase.execute(parsed, actor.id)
//   4. revalidatePath("/clients")
//
// Le pattern actorId résolu via L9 dans le use-case (CLAUDE.md 2.B.bis+) :
// la Server Action passe juste actor.id, le use-case résout le display.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";

import { ChangeClientStatusSchema, CreateClientSchema, UpdateClientSchema } from "@s2m-lic/shared";

import { requireRole } from "@/server/infrastructure/auth";
import { env } from "@/server/infrastructure/env";
import {
  changeClientStatusUseCase,
  createClientUseCase,
  updateClientUseCase,
} from "@/server/composition-root";

export async function createClientAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = CreateClientSchema.parse(input);
  // Phase 3.D : appMasterKey injecté par la Server Action (frontière infra/env)
  // pour permettre au use-case de chiffrer la clé privée client AES-256-GCM.
  const result = await createClientUseCase.execute(parsed, actor.id, {
    appMasterKey: env.APP_MASTER_KEY,
  });
  revalidatePath("/clients");
  return result;
}

export async function updateClientAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = UpdateClientSchema.parse(input);
  const result = await updateClientUseCase.execute(parsed, actor.id);
  revalidatePath("/clients");
  return result;
}

export async function changeClientStatusAction(input: unknown) {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ChangeClientStatusSchema.parse(input);
  const result = await changeClientStatusUseCase.execute(parsed, actor.id);
  revalidatePath("/clients");
  return result;
}
