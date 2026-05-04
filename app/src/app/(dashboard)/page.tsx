// ==============================================================================
// LIC v2 — / (Dashboard EC-01, Phase 11.A)
// ==============================================================================

import { requireAuthPage } from "@/server/infrastructure/auth";
import { getDashboardStatsUseCase, listNotificationsUseCase } from "@/server/composition-root";

import { DashboardClient, type NotificationCardDTO } from "./_components/DashboardClient";

export default async function DashboardPage() {
  const user = await requireAuthPage();

  const [stats, notifPage] = await Promise.all([
    getDashboardStatsUseCase.execute(),
    listNotificationsUseCase.execute({ userId: user.id, onlyUnread: true, limit: 5 }),
  ]);

  const recentNotifications: NotificationCardDTO[] = notifPage.items.map((n) => ({
    id: n.id,
    title: n.title,
    priority: n.priority,
    createdAt: n.createdAt,
    href: n.href,
  }));

  return (
    <div className="p-8">
      <DashboardClient
        kpis={{ ...stats.kpis, notificationsUnread: notifPage.unreadCount }}
        licenceStatusByMonth={stats.licenceStatusByMonth}
        topClients={stats.topClients}
        volumes={stats.volumes}
        recentLicences={stats.recentLicences}
        recentRenouvellements={stats.recentRenouvellements}
        recentNotifications={recentNotifications}
      />
    </div>
  );
}
