// ==============================================================================
// LIC v2 — MarkAllNotificationsReadUseCase (Phase 8.B)
// ==============================================================================

import type { NotificationRepository } from "../ports/notification.repository";

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(actorId: string): Promise<{ marked: number }> {
    const marked = await this.notificationRepository.markAllRead(actorId, new Date());
    return { marked };
  }
}
