// ==============================================================================
// LIC v2 — LocaleToggle (Client Component, F-12)
//
// 2 boutons FR / EN. Bouton actif = variant default (cyan), inactif = ghost.
// Clic invoque setLocaleAction (Server Action) via startTransition + revalidate.
// ==============================================================================

"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

import { setLocaleAction } from "@/app/(dashboard)/_actions";
import { Button } from "@/components/ui/button";

const LOCALES = ["fr", "en"] as const;

export function LocaleToggle() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((loc) => (
        <Button
          key={loc}
          variant={locale === loc ? "default" : "ghost"}
          size="sm"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await setLocaleAction(loc);
            });
          }}
          className="font-mono text-xs uppercase"
        >
          {loc}
        </Button>
      ))}
    </div>
  );
}
