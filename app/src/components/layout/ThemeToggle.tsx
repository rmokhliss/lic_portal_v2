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
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { setThemeAction } from "@/app/(dashboard)/_actions";
import type { Theme } from "@/app/(dashboard)/_theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ theme }: { readonly theme: Theme }) {
  const router = useRouter();
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
          // Phase 18 R-02 — `revalidatePath('/')` côté Server Action ne suffit
          // pas pour forcer le re-render <html className=...> dans Next.js 16.
          // `router.refresh()` redécode l'arbre RSC complet et déclenche la
          // ré-évaluation du root layout (qui relit le cookie spx-lic.theme et
          // applique la nouvelle classe sur <html>).
          router.refresh();
        });
      }}
      aria-label={label}
      title={label}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}
