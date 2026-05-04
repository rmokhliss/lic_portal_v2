// ==============================================================================
// LIC v2 — lic_notifications (Phase 8 étape 8.A)
//
// Messages in-app destinés à un utilisateur (ou broadcast par rôle si user_id
// nul — Phase 8 limite au ciblage user_id obligatoire). Pas d'audit (volume
// élevé attendu, données calculées).
//
// PK uuidv7 — pagination cursor par created_at DESC + id DESC.
// ==============================================================================

import { boolean, index, jsonb, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

import { createdAtOnly, primaryUuid, referenceUuid } from "@/server/infrastructure/db/columns";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const notifPriority = pgEnum("notif_priority_enum", ["INFO", "WARNING", "CRITICAL"]);

export const notifications = pgTable(
  "lic_notifications",
  {
    id: primaryUuid(),
    userId: referenceUuid("user_id", () => users.id).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 1000 }).notNull(),
    /** Lien optionnel pour rediriger vers la ressource concernée
     *  (ex: /licences/{id}/articles). */
    href: varchar("href", { length: 500 }),
    priority: notifPriority("priority").notNull().default("INFO"),
    /** Code source — ex: VOLUME_THRESHOLD, DATE_THRESHOLD, LICENCE_EXPIRED. */
    source: varchar("source", { length: 40 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    read: boolean("read").notNull().default(false),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...createdAtOnly(),
  },
  (table) => [
    index("idx_notifications_user_unread").on(table.userId, table.read),
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
  ],
);
