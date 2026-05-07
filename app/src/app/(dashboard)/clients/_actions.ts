// ==============================================================================
// LIC v2 — Server Actions /clients (Phase 4 étape 4.E + Phase 23 R-45 Result)
//
// 3 actions mutateurs sur lic_clients. Pattern Phase 23 R-45 (Result tagué) :
//   1. requireRole(["ADMIN", "SADMIN"]) — USER en lecture seule (règle L11)
//   2. Schema.parse(input) — Zod strict
//   3. try { await useCase.execute(parsed, actor.id) } catch (AppError → Result)
//   4. revalidatePath("/clients") en succès
//   5. return { success: true, data } | { success: false, error, code }
//
// Pourquoi Result et non throw : Next.js 16 anonymise les erreurs throwées par
// une Server Action (digest-only côté client → message perdu). Le pattern Result
// préserve les messages métier AppError et les codes SPX-LIC-* pour i18n. Les
// erreurs systèmes (DB down, etc.) continuent de throw → bannière 500 Next.js.
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
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";

export type { ActionResult };

export async function createClientAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createClientUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateClientSchema.parse(input);
    // Phase 3.D : appMasterKey injecté par la Server Action (frontière
    // infra/env) pour permettre au use-case de chiffrer la clé privée
    // client AES-256-GCM.
    const result = await createClientUseCase.execute(parsed, actor.id, {
      appMasterKey: env.APP_MASTER_KEY,
    });
    revalidatePath("/clients");
    return result;
  });
}

export async function updateClientAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateClientUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = UpdateClientSchema.parse(input);
    const result = await updateClientUseCase.execute(parsed, actor.id);
    revalidatePath("/clients");
    return result;
  });
}

export async function changeClientStatusAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof changeClientStatusUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = ChangeClientStatusSchema.parse(input);
    const result = await changeClientStatusUseCase.execute(parsed, actor.id);
    revalidatePath("/clients");
    return result;
  });
}
