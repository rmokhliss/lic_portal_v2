// ==============================================================================
// LIC v2 — MarkNotificationReadUseCase (Phase 8.B)
// Vérifie la propriété (l'user courant doit posséder la notif — SPX-LIC-760).
// ==============================================================================

import { notificationForbidden, notificationNotFoundById } from "../domain/notification.errors";
import type { NotificationRepository } from "../ports/notification.repository";

export interface MarkNotificationReadInput {
  readonly id: string;
}

export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: MarkNotificationReadInput, actorId: string): Promise<void> {
    const existing = await this.notificationRepository.findById(input.id);
    if (existing === null) throw notificationNotFoundById(input.id);
    if (existing.userId !== actorId) throw notificationForbidden(input.id, actorId);

    if (!existing.read) {
      await this.notificationRepository.markRead(input.id, new Date());
    }
  }
}
