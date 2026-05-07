// ==============================================================================
// LIC v2 — lic_licence_articles (Phase 6 étape 6.A + Phase 23 volumes nullable)
//
// Article d'une licence + volume autorisé/consommé. PK uuidv7. UNIQUE
// (licence_id, article_id) : un article unique par licence (l'évolution
// volume passe par updateArticleVolume + snapshot vers volume_history).
//
// Phase 23 — volume_autorise + volume_consomme deviennent NULL = "non défini"
// (équivalent métier d'illimité côté UI / .lic / .hc). Articles fonctionnalité
// (controle_volume=false) ont toujours leurs volumes à NULL ; articles
// volumétriques peuvent être créés sans volume puis renseignés plus tard.
// CHECK >= 0 conservés (NULL passe le check NOT FALSE).
//
// Audit obligatoire — mutation volumes = changement de contrat.
// ==============================================================================

import { check, index, integer, pgTable, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { articlesRef } from "@/server/modules/article/adapters/postgres/schema";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const licenceArticles = pgTable(
  "lic_licence_articles",
  {
    id: primaryUuid(),
    licenceId: referenceUuid("licence_id", () => licences.id).notNull(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesRef.id),
    volumeAutorise: integer("volume_autorise"),
    volumeConsomme: integer("volume_consomme"),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
    modifiePar: referenceUuid("modifie_par", () => users.id),
  },
  (table) => [
    unique("uq_licence_articles_licence_article").on(table.licenceId, table.articleId),
    check("ck_licence_articles_volume_autorise_pos", sql`${table.volumeAutorise} >= 0`),
    check("ck_licence_articles_volume_consomme_pos", sql`${table.volumeConsomme} >= 0`),
    index("idx_licence_articles_licence").on(table.licenceId),
    index("idx_licence_articles_article").on(table.articleId),
    index("idx_licence_articles_cree_par").on(table.creePar),
    index("idx_licence_articles_modifie_par").on(table.modifiePar),
  ],
);
