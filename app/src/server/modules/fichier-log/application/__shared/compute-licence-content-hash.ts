// ==============================================================================
// LIC v2 — computeLicenceContentHash (Phase 23)
//
// SHA-256 sur la représentation canonique du contenu produit/article/volume
// d'une licence. Utilisé pour détecter qu'un fichier .lic est obsolète :
//   - À chaque génération .lic, on stocke le hash dans lic_licences.last_lic_file_hash
//   - À chaque rendu de la fiche licence, on recalcule le hash courant et on
//     compare avec le stored. Différence → bannière "fichier .lic obsolète".
//
// Format canonique (déterministe, ordre fixe) :
//   P|<produitId1>;P|<produitId2>;A|<articleId1>:<volAutorise1>:<volConsomme1>;...
//
// - Produits triés par produitId numérique croissant
// - Articles triés par articleId numérique croissant
// - Volumes NULL représentés littéralement comme "null" (cohérent Phase 23)
// - Pas de dates ni d'IDs liaison (UUIDs) — on hash le CONTENU métier, pas les
//   métadonnées techniques. Une licence dont les volumes restent identiques
//   après un re-attach produit sans changement matériel ne déclenche pas un
//   "obsolète" intempestif.
//
// Phase 24 — switch sur Drizzle typed query builder pour le binding UUID
// (raw sql template avait un problème de cast text→uuid silencieux selon
// la version PG / postgres-js, retournant 0 rows de manière inconsistante).
// ==============================================================================

import { createHash } from "node:crypto";

import { asc, eq } from "drizzle-orm";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { licenceArticles } from "@/server/modules/licence-article/adapters/postgres/schema";
import { licenceProduits } from "@/server/modules/licence-produit/adapters/postgres/schema";

type DbClient = typeof defaultDb;

export async function computeLicenceContentHash(
  licenceId: string,
  db: DbClient = defaultDb,
): Promise<string> {
  const produits = await db
    .select({ produitId: licenceProduits.produitId })
    .from(licenceProduits)
    .where(eq(licenceProduits.licenceId, licenceId))
    .orderBy(asc(licenceProduits.produitId));

  const articles = await db
    .select({
      articleId: licenceArticles.articleId,
      volumeAutorise: licenceArticles.volumeAutorise,
      volumeConsomme: licenceArticles.volumeConsomme,
    })
    .from(licenceArticles)
    .where(eq(licenceArticles.licenceId, licenceId))
    .orderBy(asc(licenceArticles.articleId));

  const produitsPart = produits.map((p) => `P|${String(p.produitId)}`).join(";");
  const articlesPart = articles
    .map(
      (a) =>
        `A|${String(a.articleId)}:${a.volumeAutorise === null ? "null" : String(a.volumeAutorise)}:${a.volumeConsomme === null ? "null" : String(a.volumeConsomme)}`,
    )
    .join(";");

  const canonical = `${produitsPart}#${articlesPart}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
