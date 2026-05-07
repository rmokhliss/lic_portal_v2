// ==============================================================================
// LIC v2 — Server Actions /licences (Phase 18 R-12 + Phase 21 R-30 wizard)
//
// createLicenceAction          : étape 3 du wizard — crée la licence.
// addArticleAfterCreateAction  : étape 3 — boucle d'ajout articles (loop côté
//                                client, une action par article).
// listEntitesForClientAction   : étape 1 — combobox entité quand client change.
// checkLicenceDoublonAction    : étape 3 — détecte les licences ACTIF
//                                chevauchant les dates pour ce client.
//
// Garde ADMIN/SADMIN sur les mutateurs ; checkDoublon + listEntites sont en
// lecture (USER+) car ils alimentent l'UI sans muter.
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  addArticleToLicenceUseCase,
  createLicenceUseCase,
  listEntitesByClientUseCase,
  listLicencesByClientUseCase,
} from "@/server/composition-root";

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

// ============================================================================
// Phase 21 R-30 — Wizard 3 étapes : check doublon + add article post-create
// ============================================================================

const CheckDoublonSchema = z
  .object({
    clientId: z.uuid(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
  })
  .strict();

export interface DoublonInfo {
  readonly reference: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly status: string;
}

/** Phase 21 R-30 — étape 3 du wizard. Vérifie qu'aucune licence ACTIF du
 *  client ne chevauche les dates demandées. Chevauchement = `[A.debut, A.fin]
 *  intersecte [B.debut, B.fin]` ⇔ `A.debut <= B.fin AND A.fin >= B.debut`.
 *  Retourne la liste des licences en conflit (vide = pas de doublon). */
export async function checkLicenceDoublonAction(input: unknown): Promise<readonly DoublonInfo[]> {
  await requireRole(["USER", "ADMIN", "SADMIN"]);
  const parsed = CheckDoublonSchema.parse(input);

  const page = await listLicencesByClientUseCase.execute({
    clientId: parsed.clientId,
    status: "ACTIF",
    limit: 200,
  });

  const newDebut = parsed.dateDebut.getTime();
  const newFin = parsed.dateFin.getTime();
  return page.items
    .filter((l) => {
      const lDebut = new Date(l.dateDebut).getTime();
      const lFin = new Date(l.dateFin).getTime();
      // chevauchement temporel non-strict
      return lDebut <= newFin && lFin >= newDebut;
    })
    .map((l) => ({
      reference: l.reference,
      dateDebut: l.dateDebut.slice(0, 10),
      dateFin: l.dateFin.slice(0, 10),
      status: l.status,
    }));
}

const AddArticleAfterCreateSchema = z
  .object({
    licenceId: z.uuid(),
    articleId: z.number().int().positive(),
    volumeAutorise: z.number().int().nonnegative(),
  })
  .strict();

/** Phase 21 R-30 — étape 3 finale. Le wizard appelle createLicenceAction
 *  d'abord (pour avoir l'ID), puis cette action en boucle pour chaque
 *  article sélectionné. La création licence + ajouts articles ne sont PAS
 *  atomiques (limitation acceptée — un échec partiel laisse une licence
 *  existante avec un sous-ensemble d'articles, l'utilisateur peut compléter
 *  manuellement via /licences/[id]/articles). */
export async function addArticleAfterCreateAction(input: unknown): Promise<{ id: string }> {
  const user = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = AddArticleAfterCreateSchema.parse(input);
  const result = await addArticleToLicenceUseCase.execute(parsed, user.id);
  return { id: result.id };
}
