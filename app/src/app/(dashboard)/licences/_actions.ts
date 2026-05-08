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
  addProduitToLicenceUseCase,
  createLicenceUseCase,
  listEntitesByClientUseCase,
  listLicencesByClientUseCase,
} from "@/server/composition-root";
import { runAction, type ActionResult } from "@/server/infrastructure/actions/result";
import { isAppError } from "@/server/modules/error";

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

export async function createLicenceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateSchema.parse(input);
    const result = await createLicenceUseCase.execute(parsed, user.id);
    revalidatePath("/licences");
    // Phase 23 — wizard depuis fiche client : refresh la liste licences du
    // client pour que la nouvelle apparaisse immédiatement après fermeture.
    revalidatePath(`/clients/${parsed.clientId}/licences`);
    return { id: result.licence.id };
  });
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
    entiteId: z.uuid(),
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
 *  couple (client, entité) ne chevauche les dates demandées. Chevauchement =
 *  `[A.debut, A.fin]` intersecte `[B.debut, B.fin]` ⇔
 *  `A.debut <= B.fin AND A.fin >= B.debut`. Le scope (client + entité) reflète
 *  la réalité métier : un client multi-entités peut avoir des licences
 *  parallèles tant qu'elles ne couvrent pas la même entité. */
export async function checkLicenceDoublonAction(input: unknown): Promise<readonly DoublonInfo[]> {
  await requireRole(["USER", "ADMIN", "SADMIN"]);
  const parsed = CheckDoublonSchema.parse(input);

  const page = await listLicencesByClientUseCase.execute({
    clientId: parsed.clientId,
    entiteId: parsed.entiteId,
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
    /** Phase 23 — null = volume non défini (article fonctionnalité ou
     *  volumétrique non encore plafonné). */
    volumeAutorise: z.number().int().nonnegative().nullable(),
  })
  .strict();

/** Phase 21 R-30 — étape 3 finale. Le wizard appelle createLicenceAction
 *  d'abord (pour avoir l'ID), puis cette action en boucle pour chaque
 *  article sélectionné. La création licence + ajouts articles ne sont PAS
 *  atomiques (limitation acceptée — un échec partiel laisse une licence
 *  existante avec un sous-ensemble d'articles, l'utilisateur peut compléter
 *  manuellement via /licences/[id]/articles).
 *
 *  Phase 24 — gardée pour rétrocompat / appels isolés ; le wizard utilise
 *  désormais createLicenceFullAction (1 action composite) pour aligner le
 *  flow sur clients (1 action → 1 auto-refresh Next.js). */
export async function addArticleAfterCreateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = AddArticleAfterCreateSchema.parse(input);
    const result = await addArticleToLicenceUseCase.execute(parsed, user.id);
    revalidatePath("/licences");
    return { id: result.id };
  });
}

// ============================================================================
// Phase 24 — createLicenceFullAction : Server Action composite wizard
//
// Refacto du flow wizard (étape 3 du NewLicenceDialog). Au lieu d'enchaîner
// 3+ Server Actions côté client (createLicence, addProduit×N, addArticle×N),
// on fait UNE SEULE action serveur qui orchestre tout. Pourquoi :
//   - Next.js déclenche un auto-refresh des Server Components après CHAQUE
//     Server Action invoquée depuis un Client Component. Avec une chaîne de
//     N actions, l'ordre des refreshes vs l'état dialog open/close est
//     instable côté UI (cas observé sur /licences post wizard : la nouvelle
//     ligne n'apparaît pas avant un reload manuel, alors que /clients
//     fonctionne car createClientAction est seul).
//   - Une action composite garantit 1 transaction logique côté UX (1 spinner,
//     1 résultat avec failures partielles), 1 auto-refresh Next.js, alignement
//     avec le pattern createClientAction.
// ============================================================================

const CreateLicenceFullSchema = z
  .object({
    clientId: z.uuid(),
    entiteId: z.uuid(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    commentaire: z.string().max(500).optional(),
    renouvellementAuto: z.boolean().optional(),
    articles: z
      .array(
        z
          .object({
            articleId: z.number().int().positive(),
            produitId: z.number().int().positive(),
            volumeAutorise: z.number().int().nonnegative().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict();

export interface CreateLicenceFullResult {
  readonly id: string;
  /** Échecs unitaires d'ajout d'articles (la licence + les autres articles
   *  attachés sont OK). L'utilisateur peut compléter via /licences/[id]/articles. */
  readonly articleFailures: readonly string[];
}

export async function createLicenceFullAction(
  input: unknown,
): Promise<ActionResult<CreateLicenceFullResult>> {
  return runAction(async () => {
    const user = await requireRole(["ADMIN", "SADMIN"]);
    const parsed = CreateLicenceFullSchema.parse(input);

    const created = await createLicenceUseCase.execute(
      {
        clientId: parsed.clientId,
        entiteId: parsed.entiteId,
        dateDebut: parsed.dateDebut,
        dateFin: parsed.dateFin,
        ...(parsed.commentaire !== undefined ? { commentaire: parsed.commentaire } : {}),
        ...(parsed.renouvellementAuto !== undefined
          ? { renouvellementAuto: parsed.renouvellementAuto }
          : {}),
      },
      user.id,
    );
    const licenceId = created.licence.id;

    // Attache les produits parents (uniques). SPX-LIC-750 (déjà attaché) =
    // tolérance silencieuse, autres erreurs propagées dans articleFailures.
    const produitIds = new Set(parsed.articles.map((a) => a.produitId));
    for (const produitId of produitIds) {
      try {
        await addProduitToLicenceUseCase.execute({ licenceId, produitId }, user.id);
      } catch (err) {
        if (isAppError(err) && err.code === "SPX-LIC-750") continue;
        // Erreur autre — log silencieusement, l'erreur d'article suivant la
        // capturera si l'attache produit a vraiment échoué.
      }
    }

    const articleFailures: string[] = [];
    for (const article of parsed.articles) {
      try {
        await addArticleToLicenceUseCase.execute(
          {
            licenceId,
            articleId: article.articleId,
            volumeAutorise: article.volumeAutorise,
          },
          user.id,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "erreur inconnue";
        articleFailures.push(`article #${String(article.articleId)}: ${message}`);
      }
    }

    revalidatePath("/licences");
    revalidatePath(`/clients/${parsed.clientId}/licences`);
    revalidatePath(`/licences/${licenceId}/articles`);
    return { id: licenceId, articleFailures };
  });
}
