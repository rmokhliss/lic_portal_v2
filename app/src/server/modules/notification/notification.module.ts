// ==============================================================================
// LIC v2 — Composition root notification (Phase 8.B)
//
// Pas d'audit → tous les use-cases câblés ici (pas besoin de cross-module).
// Les jobs Phase 8.C consomment `notificationRepository` + use-cases.
// ==============================================================================

import { NotificationRepositoryPg } from "./adapters/postgres/notification.repository.pg";
import { CreateNotificationUseCase } from "./application/create-notification.usecase";
import { DeleteOldNotificationsUseCase } from "./application/delete-old-notifications.usecase";
import { ListNotificationsUseCase } from "./application/list-notifications.usecase";
import { MarkAllNotificationsReadUseCase } from "./application/mark-all-notifications-read.usecase";
import { MarkNotificationReadUseCase } from "./application/mark-notification-read.usecase";
import type { NotificationRepository } from "./ports/notification.repository";

export const notificationRepository: NotificationRepository = new NotificationRepositoryPg();

export const listNotificationsUseCase = new ListNotificationsUseCase(notificationRepository);
export const createNotificationUseCase = new CreateNotificationUseCase(notificationRepository);
export const markNotificationReadUseCase = new MarkNotificationReadUseCase(notificationRepository);
export const markAllNotificationsReadUseCase = new MarkAllNotificationsReadUseCase(
  notificationRepository,
);
export const deleteOldNotificationsUseCase = new DeleteOldNotificationsUseCase(
  notificationRepository,
);
