// ==============================================================================
// LIC v2 — DeleteProduitUseCase (Phase 23)
//
// Suppression DUR (DELETE) d'un produit du catalogue. Possible UNIQUEMENT
// si :
//   1. Aucune liaison lic_licence_produits ne référence le produit
//   2. Aucun article référence le produit (lic_articles_ref)
//
// Sinon : ConflictError SPX-LIC-744 (produit référencé). L'admin doit
// d'abord retirer les liaisons / supprimer les articles enfants.
//
// Pour soft-disable (rétention historique), utiliser ToggleProduitUseCase
// qui flip `actif=false`.
// ==============================================================================

import { sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { ConflictError } from "@/server/modules/error";

import { produitNotFoundByCode } from "../domain/produit.errors";

interface CountRow extends Record<string, unknown> {
  readonly count: number;
}

export class DeleteProduitUseCase {
  async execute(code: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Lookup id depuis le code (le DELETE FK utilise l'id).
      const produitRes = await tx.execute<{ id: number } & Record<string, unknown>>(sql`
        SELECT id FROM lic_produits_ref WHERE code = ${code}
      `);
      const produitRows = produitRes as unknown as readonly { id: number }[];
      const produit = produitRows[0];
      if (produit === undefined) throw produitNotFoundByCode(code);

      // Check 1 — aucune liaison licence active.
      const liaisonsRes = await tx.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count FROM lic_licence_produits
        WHERE produit_id = ${produit.id}
      `);
      const liaisonsRows = liaisonsRes as unknown as readonly CountRow[];
      const nbLiaisons = liaisonsRows[0]?.count ?? 0;
      if (nbLiaisons > 0) {
        throw new ConflictError({
          code: "SPX-LIC-744",
          message: `Impossible de supprimer le produit "${code}" : ${String(nbLiaisons)} licence(s) le référencent. Retirer les liaisons d'abord ou désactiver le produit.`,
        });
      }

      // Check 2 — aucun article enfant.
      const articlesRes = await tx.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count FROM lic_articles_ref
        WHERE produit_id = ${produit.id}
      `);
      const articlesRows = articlesRes as unknown as readonly CountRow[];
      const nbArticles = articlesRows[0]?.count ?? 0;
      if (nbArticles > 0) {
        throw new ConflictError({
          code: "SPX-LIC-744",
          message: `Impossible de supprimer le produit "${code}" : ${String(nbArticles)} article(s) lui sont rattaché(s). Supprimer les articles d'abord.`,
        });
      }

      await tx.execute(sql`DELETE FROM lic_produits_ref WHERE id = ${produit.id}`);
    });
  }
}
