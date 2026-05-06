// ==============================================================================
// LIC v2 — /notifications (Phase 8.D, EC-10)
// ==============================================================================

import { requireAuthPage } from "@/server/infrastructure/auth";
import { listNotificationsUseCase } from "@/server/composition-root";

import { NotificationsList } from "./_components/NotificationsList";

export default async function NotificationsPage() {
  const user = await requireAuthPage();

  const page = await listNotificationsUseCase.execute({
    userId: user.id,
    limit: 50,
  });

  return (
    <div className="p-6">
      <NotificationsList
        initialItems={page.items}
        initialCursor={page.nextCursor}
        initialUnread={page.unreadCount}
      />
    </div>
  );
}
