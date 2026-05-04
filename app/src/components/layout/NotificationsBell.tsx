// ==============================================================================
// LIC v2 — NotificationsBell (Phase 8.D)
//
// Drawer cloche header — fetch les 10 dernières notifications de l'utilisateur
// au clic, expose markRead/markAllRead, lien vers la page complète /notifications.
// Badge `unreadCount` rendu en absolu sur l'icône.
//
// Le badge se met à jour à l'ouverture du drawer (pas de polling background —
// décision MVP : l'utilisateur ouvre la cloche → on raffraîchit). Les Server
// Actions revalidatePath déclenchent une re-render de page côté serveur,
// pas du drawer (Client Component) — c'est volontaire pour rester économe en
// RPC. Une amélioration future Phase 13 pourrait ajouter un polling 60s.
// ==============================================================================

"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import {
  fetchMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/(dashboard)/notifications/_actions";

interface DrawerItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  readonly priority: "INFO" | "WARNING" | "CRITICAL";
  readonly read: boolean;
  readonly createdAt: string;
}

const PRIORITY_DOT: Record<DrawerItem["priority"], string> = {
  INFO: "bg-info",
  WARNING: "bg-warning",
  CRITICAL: "bg-destructive",
};

export function NotificationsBell() {
  const tNav = useTranslations("nav.items");
  const t = useTranslations("notifications.drawer");
  const [open, setOpen] = useState<boolean>(false);
  const [items, setItems] = useState<readonly DrawerItem[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [pending, startTransition] = useTransition();

  const refresh = async (): Promise<void> => {
    try {
      const page = await fetchMyNotificationsAction({});
      setItems(
        page.items.slice(0, 10).map((i) => ({
          id: i.id,
          title: i.title,
          body: i.body,
          href: i.href,
          priority: i.priority,
          read: i.read,
          createdAt: i.createdAt,
        })),
      );
      setUnread(page.unreadCount);
    } catch {
      // silencieux — l'icône reste sans badge si la requête échoue
    }
  };

  // Premier fetch au mount pour afficher le badge sans avoir à ouvrir.
  useEffect(() => {
    void refresh();
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      startTransition(() => {
        void refresh();
      });
    }
  };

  const onMarkRead = (id: string) => {
    startTransition(() => {
      void (async () => {
        await markNotificationReadAction({ id });
        setItems(items.map((i) => (i.id === id ? { ...i, read: true } : i)));
        setUnread(Math.max(0, unread - 1));
      })();
    });
  };

  const onMarkAllRead = () => {
    startTransition(() => {
      void (async () => {
        await markAllNotificationsReadAction();
        setItems(items.map((i) => ({ ...i, read: true })));
        setUnread(0);
      })();
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          onOpenChange(true);
        }}
        aria-label={tNav("notifications")}
        className="relative"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col gap-0">
          <SheetHeader>
            <SheetTitle>{tNav("notifications")}</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-1">
            <span className="text-muted-foreground text-xs">
              {t("unreadCount", { count: unread })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || unread === 0}
              onClick={onMarkAllRead}
            >
              {t("markAllRead")}
            </Button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">{t("empty")}</p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-md border p-2 text-sm ${item.read ? "opacity-60" : ""}`}
                >
                  <header className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${PRIORITY_DOT[item.priority]}`}
                    />
                    <div className="flex-1">
                      <h4 className="text-foreground font-display text-sm">{item.title}</h4>
                      <p className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                        {formatRelative(item.createdAt)}
                      </p>
                    </div>
                  </header>
                  <p className="text-foreground mt-1 text-xs">{item.body}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {item.href !== null ? (
                      <Link
                        href={item.href}
                        className="text-info text-xs underline"
                        onClick={() => {
                          setOpen(false);
                        }}
                      >
                        {t("openLink")}
                      </Link>
                    ) : (
                      <span />
                    )}
                    {!item.read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          onMarkRead(item.id);
                        }}
                      >
                        {t("markRead")}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-border border-t p-3">
            <Link
              href="/notifications"
              className="text-info inline-block text-xs underline"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t("seeAll")}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMin = (Date.now() - date.getTime()) / 60_000;
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${String(Math.floor(diffMin))} min`;
  if (diffMin < 60 * 24) return `il y a ${String(Math.floor(diffMin / 60))} h`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
