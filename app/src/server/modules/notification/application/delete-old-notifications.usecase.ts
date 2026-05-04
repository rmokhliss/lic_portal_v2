// ==============================================================================
// LIC v2 — DeleteOldNotificationsUseCase (Phase 8.B)
// Job cleanup — supprime les notifications lues plus vieilles que `daysOld`.
// ==============================================================================

import type { NotificationRepository } from "../ports/notification.repository";

export interface DeleteOldNotificationsInput {
  readonly daysOld?: number;
}

const DEFAULT_DAYS_OLD = 90;

export class DeleteOldNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: DeleteOldNotificationsInput = {}): Promise<{ deleted: number }> {
    const days = input.daysOld ?? DEFAULT_DAYS_OLD;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const deleted = await this.notificationRepository.deleteReadOlderThan(cutoff);
    return { deleted };
  }
}
