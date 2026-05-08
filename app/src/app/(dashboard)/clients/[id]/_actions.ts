// ==============================================================================
// LIC v2 — Server Actions /clients/[id] (Phase 4 étape 4.F)
//
// 6 mutateurs entites + contacts. Audit obligatoire via use-cases (4.C).
// Pattern strict (CLAUDE.md §2) :
//   1. requireRole(["ADMIN", "SADMIN"]) — règle L11
//   2. Schema.parse(input) — Zod strict
//   3. await useCase.execute(parsed, actor.id)
//   4. revalidatePath sur l'URL parente détail
//
// Note : changeClientStatusAction + updateClientAction sont déjà exposées
// dans clients/_actions.ts (Phase 4.E) — pas de duplication, les Client
// Components du détail importent depuis "../../_actions". DRY préservé.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CreateContactSchema,
  CreateEntiteSchema,
  CreateLicenceSchema,
  DeleteContactSchema,
  ToggleEntiteActiveSchema,
  UpdateContactSchema,
  UpdateEntiteSchema,
} from "@s2m-lic/shared";

import { requireRole } from "@/server/infrastructure/auth";
import {
  createContactUseCase,
  createEntiteUseCase,
  createLicenceUseCase,
  deleteContactUseCase,
  toggleEntiteActiveUseCase,
  updateContactUseCase,
  updateEntiteUseCase,
} from "@/server/composition-root";
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";

const ClientIdSchema = z.object({ clientId: z.uuid() });

function pathFor(clientId: string, tab: "entites" | "contacts" | "licences"): string {
  return `/clients/${clientId}/${tab}`;
}

// --- Entités ----------------------------------------------------------------

export async function createEntiteAction(
  input: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createEntiteUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateEntiteSchema.parse(input);
    const result = await createEntiteUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(parsed.clientId, "entites"));
    revalidatePath(pathFor(parsed.clientId, "contacts"));
    return result;
  });
}

export async function updateEntiteAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateEntiteUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = UpdateEntiteSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    const result = await updateEntiteUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(clientId, "entites"));
    revalidatePath(pathFor(clientId, "contacts"));
    return result;
  });
}

export async function toggleEntiteActiveAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof toggleEntiteActiveUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = ToggleEntiteActiveSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    const result = await toggleEntiteActiveUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(clientId, "entites"));
    revalidatePath(pathFor(clientId, "contacts"));
    return result;
  });
}

// --- Contacts ---------------------------------------------------------------

export async function createContactAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createContactUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateContactSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    const result = await createContactUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(clientId, "contacts"));
    return result;
  });
}

export async function updateContactAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof updateContactUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = UpdateContactSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    const result = await updateContactUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(clientId, "contacts"));
    return result;
  });
}

export async function deleteContactAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = DeleteContactSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    await deleteContactUseCase.execute(parsed, actor.id);
    revalidatePath(pathFor(clientId, "contacts"));
  });
}

// --- Licences (Phase 5.E) ---------------------------------------------------

export async function createLicenceAction(
  input: unknown,
  clientIdContext: unknown,
): Promise<ActionResult<Awaited<ReturnType<typeof createLicenceUseCase.execute>>>> {
  return runAction(async () => {
    const actor = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateLicenceSchema.parse(input);
    const { clientId } = ClientIdSchema.parse(clientIdContext);
    // Conversion ISO string → Date (le schéma Zod vérifie le format ISO).
    const result = await createLicenceUseCase.execute(
      {
        clientId: parsed.clientId,
        entiteId: parsed.entiteId,
        dateDebut: new Date(parsed.dateDebut),
        dateFin: new Date(parsed.dateFin),
        ...(parsed.commentaire !== undefined ? { commentaire: parsed.commentaire } : {}),
        ...(parsed.renouvellementAuto !== undefined
          ? { renouvellementAuto: parsed.renouvellementAuto }
          : {}),
      },
      actor.id,
    );
    revalidatePath(pathFor(clientId, "licences"));
    return result;
  });
}

// --- Historique (Phase 7.B) -------------------------------------------------

import { listAuditByClientScopeUseCase } from "@/server/composition-root";

const ClientHistoriqueQuerySchema = z
  .object({
    clientId: z.uuid(),
    cursor: z.string().max(200).optional(),
    action: z.string().max(40).optional(),
    acteur: z.string().max(200).optional(),
  })
  .strict();

export async function fetchClientHistoriqueAction(input: unknown) {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ClientHistoriqueQuerySchema.parse(input);
  return listAuditByClientScopeUseCase.execute({
    clientId: parsed.clientId,
    filters: {
      ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
      ...(parsed.action !== undefined ? { action: parsed.action } : {}),
      ...(parsed.acteur !== undefined ? { userDisplayLike: parsed.acteur } : {}),
      limit: 50,
    },
  });
}
