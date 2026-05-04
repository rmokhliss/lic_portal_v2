// ==============================================================================
// LIC v2 — ListNotificationsUseCase (Phase 8.B)
// ==============================================================================

import { toDTO, type NotificationDTO } from "../adapters/postgres/notification.mapper";
import type {
  ListNotificationsFilters,
  NotificationRepository,
} from "../ports/notification.repository";

export interface ListNotificationsInput extends Omit<ListNotificationsFilters, "userId"> {
  readonly userId: string;
}

export interface ListNotificationsOutput {
  readonly items: readonly NotificationDTO[];
  readonly nextCursor: string | null;
  readonly unreadCount: number;
}

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: ListNotificationsInput): Promise<ListNotificationsOutput> {
    const page = await this.notificationRepository.listPaginated(input);
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
      unreadCount: page.unreadCount,
    };
  }
}
