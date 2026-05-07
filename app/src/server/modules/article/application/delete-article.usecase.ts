// ==============================================================================
// LIC v2 — DeleteArticleUseCase (Phase 23)
//
// Suppression DUR (DELETE) d'un article du catalogue. Possible UNIQUEMENT
// si :
//   1. Aucune liaison lic_licence_articles ne référence l'article
//   2. Aucun snapshot lic_article_volume_history (FK preserve l'historique)
//
// Sinon : ConflictError SPX-LIC-762 (article référencé). L'admin doit
// d'abord retirer les liaisons des licences concernées (ou désactiver
// l'article via ToggleArticleUseCase).
// ==============================================================================

import { sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { ConflictError } from "@/server/modules/error";

import { articleNotFoundById } from "../domain/article.errors";

interface CountRow extends Record<string, unknown> {
  readonly count: number;
}

export class DeleteArticleUseCase {
  async execute(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const articleRes = await tx.execute<{ id: number } & Record<string, unknown>>(sql`
        SELECT id FROM lic_articles_ref WHERE id = ${id}
      `);
      const articleRows = articleRes as unknown as readonly { id: number }[];
      if (articleRows[0] === undefined) throw articleNotFoundById(id);

      // Check 1 — aucune liaison licence_articles.
      const liaisonsRes = await tx.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count FROM lic_licence_articles
        WHERE article_id = ${id}
      `);
      const liaisonsRows = liaisonsRes as unknown as readonly CountRow[];
      const nbLiaisons = liaisonsRows[0]?.count ?? 0;
      if (nbLiaisons > 0) {
        throw new ConflictError({
          code: "SPX-LIC-762",
          message: `Impossible de supprimer l'article : ${String(nbLiaisons)} licence(s) le référencent. Retirer les liaisons d'abord ou désactiver l'article.`,
        });
      }

      // Check 2 — aucun snapshot historique (préserve la traçabilité).
      const snapshotsRes = await tx.execute<CountRow>(sql`
        SELECT COUNT(*)::int AS count FROM lic_article_volume_history
        WHERE article_id = ${id}
      `);
      const snapshotsRows = snapshotsRes as unknown as readonly CountRow[];
      const nbSnapshots = snapshotsRows[0]?.count ?? 0;
      if (nbSnapshots > 0) {
        throw new ConflictError({
          code: "SPX-LIC-762",
          message: `Impossible de supprimer l'article : ${String(nbSnapshots)} snapshot(s) historique(s) le référencent. Désactiver l'article au lieu de supprimer.`,
        });
      }

      await tx.execute(sql`DELETE FROM lic_articles_ref WHERE id = ${id}`);
    });
  }
}
