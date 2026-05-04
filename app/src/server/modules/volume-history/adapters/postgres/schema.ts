// ==============================================================================
// LIC v2 — lic_article_volume_history (Phase 6 étape 6.A)
//
// Snapshots mensuels volume autorisé/consommé par licence×article. Append-only
// (PK uuidv7, pas d'update). Alimenté par job snapshot Phase 8 ; consultable
// via UI EC-04 et EC-09 (rapports volumétrie).
//
// Pas d'audit (données calculées, pas d'action utilisateur).
//
// `periode` = premier jour du mois (date pure). UNIQUE (licence_id, article_id,
// periode) — un seul snapshot par mois par couple licence/article.
// ==============================================================================

import { check, date, index, integer, pgTable, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { createdAtOnly, primaryUuid, referenceUuid } from "@/server/infrastructure/db/columns";
import { articlesRef } from "@/server/modules/article/adapters/postgres/schema";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";

export const articleVolumeHistory = pgTable(
  "lic_article_volume_history",
  {
    id: primaryUuid(),
    licenceId: referenceUuid("licence_id", () => licences.id).notNull(),
    articleId: integer("article_id")
      .notNull()
      .references(() => articlesRef.id),
    periode: date("periode").notNull(),
    volumeAutorise: integer("volume_autorise").notNull(),
    volumeConsomme: integer("volume_consomme").notNull(),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull().defaultNow(),
    ...createdAtOnly(),
  },
  (table) => [
    unique("uq_volume_history_licence_article_periode").on(
      table.licenceId,
      table.articleId,
      table.periode,
    ),
    check("ck_volume_history_autorise_pos", sql`${table.volumeAutorise} >= 0`),
    check("ck_volume_history_consomme_pos", sql`${table.volumeConsomme} >= 0`),
    index("idx_volume_history_licence").on(table.licenceId),
    index("idx_volume_history_article").on(table.articleId),
    index("idx_volume_history_periode").on(table.periode),
  ],
);
