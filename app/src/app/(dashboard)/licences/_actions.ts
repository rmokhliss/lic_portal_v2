// ==============================================================================
// LIC v2 — Server Actions /licences (Phase 18 R-12)
//
// createLicenceAction : crée une licence depuis le wizard /licences.
// listEntitesForClientAction : helper pour le combobox entité du wizard
// (rechargement quand le client sélectionné change).
//
// Garde ADMIN/SADMIN — la création est protégée côté Server Action ;
// l'item nav /licences est USER+ pour la consultation seulement.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import { createLicenceUseCase, listEntitesByClientUseCase } from "@/server/composition-root";

const CreateSchema = z
  .object({
    clientId: z.uuid(),
    entiteId: z.uuid(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    commentaire: z.string().max(500).optional(),
    renouvellementAuto: z.boolean().optional(),
  })
  .strict();

export interface EntiteOption {
  readonly id: string;
  readonly nom: string;
}

export async function createLicenceAction(input: unknown): Promise<{ id: string }> {
  const user = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = CreateSchema.parse(input);
  const result = await createLicenceUseCase.execute(parsed, user.id);
  revalidatePath("/licences");
  return { id: result.licence.id };
}

/** Phase 18 R-12 — combobox entité du wizard. Lecture autorisée USER+. */
export async function listEntitesForClientAction(
  clientId: string,
): Promise<readonly EntiteOption[]> {
  await requireRole(["USER", "ADMIN", "SADMIN"]);
  const Schema = z.uuid();
  const id = Schema.parse(clientId);
  const entites = await listEntitesByClientUseCase.execute(id);
  return entites.map((e) => ({ id: e.id, nom: e.nom }));
}
