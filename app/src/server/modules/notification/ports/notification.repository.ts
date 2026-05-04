// ==============================================================================
// LIC v2 — Port NotificationRepository (Phase 8.B)
// Cursor pagination via createdAt DESC + id DESC.
// ==============================================================================

import type { Notification, PersistedNotification } from "../domain/notification.entity";

export type DbTransaction = unknown;

export interface ListNotificationsFilters {
  readonly userId: string;
  readonly onlyUnread?: boolean;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface NotificationPage {
  readonly items: readonly PersistedNotification[];
  readonly nextCursor: string | null;
  readonly unreadCount: number;
}

export abstract class NotificationRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedNotification | null>;
  abstract listPaginated(
    filters: ListNotificationsFilters,
    tx?: DbTransaction,
  ): Promise<NotificationPage>;
  abstract countUnread(userId: string, tx?: DbTransaction): Promise<number>;
  abstract save(notification: Notification, tx?: DbTransaction): Promise<PersistedNotification>;
  abstract markRead(id: string, readAt: Date, tx?: DbTransaction): Promise<void>;
  abstract markAllRead(userId: string, readAt: Date, tx?: DbTransaction): Promise<number>;
  /** Supprime les notifications lues plus anciennes que `cutoff`. Retourne
   *  le nombre supprimé pour log/return du job cleanup. */
  abstract deleteReadOlderThan(cutoff: Date, tx?: DbTransaction): Promise<number>;
}
