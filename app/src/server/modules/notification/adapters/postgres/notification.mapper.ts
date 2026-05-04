// ==============================================================================
// LIC v2 — Mapper Notification (Phase 8.B)
// ==============================================================================

import type { InferSelectModel } from "drizzle-orm";

import { Notification, type PersistedNotification } from "../../domain/notification.entity";

import type { notifications } from "./schema";

type Row = InferSelectModel<typeof notifications>;

export interface NotificationDTO {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: "INFO" | "WARNING" | "CRITICAL";
  readonly source: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export function toEntity(row: Row): PersistedNotification {
  return Notification.rehydrate({
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    href: row.href,
    priority: row.priority,
    source: row.source,
    metadata: row.metadata,
    read: row.read,
    readAt: row.readAt,
    createdAt: row.createdAt,
  });
}

export function toDTO(entity: PersistedNotification): NotificationDTO {
  return {
    id: entity.id,
    userId: entity.userId,
    title: entity.title,
    body: entity.body,
    href: entity.href,
    priority: entity.priority,
    source: entity.source,
    metadata: entity.metadata,
    read: entity.read,
    readAt: entity.readAt === null ? null : entity.readAt.toISOString(),
    createdAt: entity.createdAt.toISOString(),
  };
}
