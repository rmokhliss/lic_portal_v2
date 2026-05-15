// ==============================================================================
// LIC v2 — computeLicenceContentHash (Phase 23, format v2)
//
// SHA-256 sur la représentation canonique des éléments CONTRACTUELS d'une
// licence. Utilisé pour détecter qu'un fichier .lic est obsolète :
//   - À chaque génération .lic, on stocke le hash dans lic_licences.last_lic_file_hash
//   - À chaque rendu de la fiche licence, on recalcule le hash courant et on
//     compare avec le stored. Différence → bannière "fichier .lic obsolète".
//
// Format canonique v2 (déterministe, ordre fixe) :
//   L|<dateDebutISO>|<dateFinISO>|<status>#P|<produitId1>;P|<produitId2>#A|<articleId1>:<volAutorise1>;...
//
// - Header "L|..." = données licence : dates contractuelles + statut
// - Produits triés par produitId numérique croissant
// - Articles triés par articleId numérique croissant
// - volumeAutorise (contractuel) inclus ; volumeAutorise NULL → "null"
// - volumeConsomme VOLONTAIREMENT EXCLU : un import healthcheck met à jour
//   vol_consomme et NE DOIT PAS marquer le .lic comme obsolète (les éléments
//   contractuels n'ont pas bougé). Cohérent avec le contenu réel du fichier
//   .lic, qui n'embarque pas la consommation effective.
// - Pas d'IDs liaison (UUIDs) — on hash le CONTENU métier, pas les méta-
//   données techniques. Une licence dont les éléments contractuels restent
//   identiques après un re-attach produit sans changement matériel ne
//   déclenche pas un "obsolète" intempestif.
//
// Invalidations légitimes du .lic (toutes incluses dans le hash) :
//   - Ajout/suppression d'un article ou produit
//   - Modification du vol_autorise (volume contractuel)
//   - Modification des dates contractuelles (date_debut, date_fin)
//   - Modification du statut
//
// Phase 24 — switch sur Drizzle typed query builder pour le binding UUID
// (raw sql template avait un problème de cast text→uuid silencieux selon
// la version PG / postgres-js, retournant 0 rows de manière inconsistante).
// ==============================================================================

import { createHash } from "node:crypto";

import { asc, eq } from "drizzle-orm";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";
import { licenceArticles } from "@/server/modules/licence-article/adapters/postgres/schema";
import { licenceProduits } from "@/server/modules/licence-produit/adapters/postgres/schema";

type DbClient = typeof defaultDb;

export async function computeLicenceContentHash(
  licenceId: string,
  db: DbClient = defaultDb,
): Promise<string> {
  const licenceRows = await db
    .select({
      dateDebut: licences.dateDebut,
      dateFin: licences.dateFin,
      status: licences.status,
    })
    .from(licences)
    .where(eq(licences.id, licenceId))
    .limit(1);

  const produits = await db
    .select({ produitId: licenceProduits.produitId })
    .from(licenceProduits)
    .where(eq(licenceProduits.licenceId, licenceId))
    .orderBy(asc(licenceProduits.produitId));

  const articles = await db
    .select({
      articleId: licenceArticles.articleId,
      volumeAutorise: licenceArticles.volumeAutorise,
    })
    .from(licenceArticles)
    .where(eq(licenceArticles.licenceId, licenceId))
    .orderBy(asc(licenceArticles.articleId));

  const lic = licenceRows[0];
  const licencePart =
    lic === undefined
      ? "L|null|null|null"
      : `L|${lic.dateDebut.toISOString()}|${lic.dateFin.toISOString()}|${lic.status}`;
  const produitsPart = produits.map((p) => `P|${String(p.produitId)}`).join(";");
  const articlesPart = articles
    .map(
      (a) =>
        `A|${String(a.articleId)}:${a.volumeAutorise === null ? "null" : String(a.volumeAutorise)}`,
    )
    .join(";");

  const canonical = `${licencePart}#${produitsPart}#${articlesPart}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
