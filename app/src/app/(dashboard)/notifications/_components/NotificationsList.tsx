// ==============================================================================
// LIC v2 — NotificationsList (Phase 8.D)
//
// Page complète /notifications : liste avec filtre lu/non-lu, marquer
// individuellement / tous comme lus. Lien `href` ouvre la page détail.
// ==============================================================================

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import {
  archiveOldNotificationsAction,
  fetchMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../_actions";

export interface NotificationItemDTO {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: "INFO" | "WARNING" | "CRITICAL";
  readonly source: string;
  readonly read: boolean;
  readonly createdAt: string;
}

export interface NotificationsListProps {
  readonly initialItems: readonly NotificationItemDTO[];
  readonly initialCursor: string | null;
  readonly initialUnread: number;
}

const PRIORITY_STYLES: Record<NotificationItemDTO["priority"], string> = {
  INFO: "border-info/40 bg-info/10",
  WARNING: "border-warning/40 bg-warning/10",
  CRITICAL: "border-destructive/40 bg-destructive/10",
};

export function NotificationsList(props: NotificationsListProps) {
  const t = useTranslations("notifications.page");
  const [items, setItems] = useState<readonly NotificationItemDTO[]>(props.initialItems);
  const [cursor, setCursor] = useState<string | null>(props.initialCursor);
  const [unreadCount, setUnreadCount] = useState<number>(props.initialUnread);
  const [onlyUnread, setOnlyUnread] = useState<boolean>(false);
  // Phase 18 R-16 — filtre priorité côté client (les items sont déjà chargés
  // côté serveur, pas besoin de re-fetch). Pour étendre à la pagination, le
  // filtre devra basculer côté Server Action.
  const [priorityFilter, setPriorityFilter] = useState<"" | NotificationItemDTO["priority"]>("");
  const [archiveResult, setArchiveResult] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const filteredItems =
    priorityFilter === "" ? items : items.filter((i) => i.priority === priorityFilter);

  const refresh = (resetCursor: boolean) => {
    startTransition(() => {
      void (async () => {
        const page = await fetchMyNotificationsAction({
          ...(resetCursor ? {} : { cursor: cursor ?? undefined }),
          onlyUnread,
        });
        if (resetCursor) {
          setItems(page.items);
        } else {
          setItems([...items, ...page.items]);
        }
        setCursor(page.nextCursor);
        setUnreadCount(page.unreadCount);
      })();
    });
  };

  const onToggleUnread = () => {
    setOnlyUnread(!onlyUnread);
    startTransition(() => {
      void (async () => {
        const page = await fetchMyNotificationsAction({ onlyUnread: !onlyUnread });
        setItems(page.items);
        setCursor(page.nextCursor);
        setUnreadCount(page.unreadCount);
      })();
    });
  };

  const onMarkRead = (id: string) => {
    startTransition(() => {
      void (async () => {
        await markNotificationReadAction({ id });
        setItems(items.map((i) => (i.id === id ? { ...i, read: true } : i)));
        setUnreadCount(Math.max(0, unreadCount - 1));
      })();
    });
  };

  const onMarkAllRead = () => {
    startTransition(() => {
      void (async () => {
        await markAllNotificationsReadAction();
        setItems(items.map((i) => ({ ...i, read: true })));
        setUnreadCount(0);
      })();
    });
  };

  // Phase 18 R-16 — bouton archiver. Supprime les notifications LUES de plus
  // de 30 jours. Action ADMIN/SADMIN — la Server Action enforce le rôle, le
  // bouton reste visible pour tous mais l'utilisateur USER recevra un 403.
  const onArchiveOld = () => {
    setArchiveResult("");
    startTransition(() => {
      void (async () => {
        try {
          const r = await archiveOldNotificationsAction({ daysOld: 30 });
          setArchiveResult(`${String(r.deleted)} notification(s) archivée(s).`);
          // Re-fetch pour rafraîchir la liste après suppression.
          const page = await fetchMyNotificationsAction({ onlyUnread });
          setItems(page.items);
          setCursor(page.nextCursor);
          setUnreadCount(page.unreadCount);
        } catch (err) {
          setArchiveResult(err instanceof Error ? err.message : "Erreur archivage");
        }
      })();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-xl">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("unreadCount", { count: unreadCount })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value as "" | NotificationItemDTO["priority"]);
            }}
            className="border-input bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            aria-label="Filtrer par priorité"
          >
            <option value="">Toutes priorités</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <Button type="button" variant="outline" onClick={onToggleUnread} disabled={pending}>
            {onlyUnread ? t("showAll") : t("showOnlyUnread")}
          </Button>
          <Button type="button" disabled={pending || unreadCount === 0} onClick={onMarkAllRead}>
            {t("markAllRead")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onArchiveOld}
            title="Supprime les notifications lues de plus de 30 jours"
          >
            Archiver &gt; 30j
          </Button>
        </div>
      </div>
      {archiveResult.length > 0 && <p className="text-muted-foreground text-xs">{archiveResult}</p>}

      {filteredItems.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filteredItems.map((notif) => (
            <li
              key={notif.id}
              className={`rounded-md border p-3 ${PRIORITY_STYLES[notif.priority]} ${notif.read ? "opacity-60" : ""}`}
            >
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-foreground text-sm">{notif.title}</h3>
                  <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                    {formatDate(notif.createdAt)} · {notif.source} · {notif.priority}
                  </p>
                </div>
                {!notif.read && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      onMarkRead(notif.id);
                    }}
                  >
                    {t("markRead")}
                  </Button>
                )}
              </header>
              <p className="text-foreground mt-2 text-sm">{notif.body}</p>
              {notif.href !== null && (
                <Link href={notif.href} className="text-info mt-2 inline-block text-xs underline">
                  {t("openLink")}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {cursor !== null && (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              refresh(false);
            }}
          >
            {pending ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
