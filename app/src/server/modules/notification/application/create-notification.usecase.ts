// ==============================================================================
// LIC v2 — CreateNotificationUseCase (Phase 8.B)
// Pas d'audit. Utilisé par les jobs check-alerts pour publier les
// notifications in-app aux utilisateurs ciblés.
// ==============================================================================

import { toDTO, type NotificationDTO } from "../adapters/postgres/notification.mapper";
import {
  Notification,
  type CreateNotificationInput as DomainInput,
} from "../domain/notification.entity";
import type { NotificationRepository } from "../ports/notification.repository";

export type CreateNotificationInput = DomainInput;

export class CreateNotificationUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: CreateNotificationInput): Promise<NotificationDTO> {
    const notification = Notification.create(input);
    const saved = await this.notificationRepository.save(notification);
    return toDTO(saved);
  }
}
