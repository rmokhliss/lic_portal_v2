// ==============================================================================
// LIC v2 — NotificationsBell (Client Component, F-12)
//
// Cloche header — placeholder F-12 : Sheet shadcn vide hardcodé "Aucune
// notification". Vraies notifs en Phase 8 (EC-10).
// ==============================================================================

"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const tNav = useTranslations("nav.items");
  const tCommon = useTranslations("common");

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={tNav("notifications")}
      >
        <Bell className="size-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{tNav("notifications")}</SheetTitle>
          </SheetHeader>
          <div className="text-muted-foreground p-6 text-sm">{tCommon("noResults")}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
