// ==============================================================================
// LIC v2 — ThemeToggle (Client Component, Phase 17 F1)
//
// Bouton icône Sun/Moon — bascule cookie `spx-lic.theme` via setThemeAction.
// Reçoit le thème actif en prop depuis le Server Component parent (AppHeader)
// pour éviter un flash SSR/CSR (le cookie est lu côté serveur dans layout.tsx).
// Tailwind `darkMode: 'class'` est déjà actif via la classe sur <html>.
// ==============================================================================

"use client";

import { Moon, Sun } from "lucide-react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { setThemeAction } from "@/app/(dashboard)/_actions";
import type { Theme } from "@/app/(dashboard)/_theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ theme }: { readonly theme: Theme }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("header.theme");

  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? t("light") : t("dark");

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await setThemeAction(next);
        });
      }}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}
