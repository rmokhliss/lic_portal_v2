// ==============================================================================
// LIC v2 — Adapter Postgres NotificationRepository (Phase 8.B)
// ==============================================================================

import { and, count, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import { decodeCursor, encodeCursor } from "@/server/infrastructure/db/cursor";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { Notification, PersistedNotification } from "../../domain/notification.entity";
import {
  type DbTransaction,
  type ListNotificationsFilters,
  type NotificationPage,
  NotificationRepository,
} from "../../ports/notification.repository";

import { toEntity } from "./notification.mapper";
import { notifications } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class NotificationRepositoryPg extends NotificationRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedNotification | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async listPaginated(
    filters: ListNotificationsFilters,
    tx?: DbTransaction,
  ): Promise<NotificationPage> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    const conds = [eq(notifications.userId, filters.userId)];
    if (filters.onlyUnread === true) conds.push(eq(notifications.read, false));
    if (filters.cursor !== undefined) {
      const { timestamp, id } = decodeCursor(filters.cursor);
      const cursorCond = or(
        lt(notifications.createdAt, timestamp),
        and(eq(notifications.createdAt, timestamp), lt(notifications.id, id)),
      );
      if (cursorCond !== undefined) conds.push(cursorCond);
    }

    const rows = await target
      .select()
      .from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(toEntity);
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.createdAt, last.id) : null;
    const unreadCount = await this.countUnread(filters.userId, tx);

    return { items, nextCursor, unreadCount };
  }

  async countUnread(userId: string, tx?: DbTransaction): Promise<number> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return rows[0]?.value ?? 0;
  }

  async save(notification: Notification, tx?: DbTransaction): Promise<PersistedNotification> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(notifications)
      .values({
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        priority: notification.priority,
        source: notification.source,
        metadata: notification.metadata,
        read: notification.read,
        readAt: notification.readAt,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_notifications n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async markRead(id: string, readAt: Date, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.update(notifications).set({ read: true, readAt }).where(eq(notifications.id, id));
  }

  async markAllRead(userId: string, readAt: Date, tx?: DbTransaction): Promise<number> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target
      .update(notifications)
      .set({ read: true, readAt })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result.count;
  }

  async deleteReadOlderThan(cutoff: Date, tx?: DbTransaction): Promise<number> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target
      .delete(notifications)
      .where(and(eq(notifications.read, true), lte(notifications.createdAt, cutoff)));
    return result.count;
  }
}

// Suppression d'imports inutilisés via no-op (sql conservé pour usages futurs).
void sql;
