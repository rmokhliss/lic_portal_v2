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
// ==============================================================================

import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";

import { db as defaultDb } from "@/server/infrastructure/db/client";

type DbClient = typeof defaultDb;

interface ProduitRow extends Record<string, unknown> {
  readonly produit_id: number;
}

interface ArticleRow extends Record<string, unknown> {
  readonly article_id: number;
  readonly volume_autorise: number | null;
  readonly volume_consomme: number | null;
}

export async function computeLicenceContentHash(
  licenceId: string,
  db: DbClient = defaultDb,
): Promise<string> {
  const produitsRes = await db.execute<ProduitRow>(sql`
    SELECT produit_id FROM lic_licence_produits
    WHERE licence_id = ${licenceId}
    ORDER BY produit_id ASC
  `);
  const articlesRes = await db.execute<ArticleRow>(sql`
    SELECT article_id, volume_autorise, volume_consomme
    FROM lic_licence_articles
    WHERE licence_id = ${licenceId}
    ORDER BY article_id ASC
  `);

  const produits = produitsRes as unknown as readonly ProduitRow[];
  const articles = articlesRes as unknown as readonly ArticleRow[];

  const produitsPart = produits.map((p) => `P|${String(p.produit_id)}`).join(";");
  const articlesPart = articles
    .map(
      (a) =>
        `A|${String(a.article_id)}:${a.volume_autorise === null ? "null" : String(a.volume_autorise)}:${a.volume_consomme === null ? "null" : String(a.volume_consomme)}`,
    )
    .join(";");

  const canonical = `${produitsPart}#${articlesPart}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
