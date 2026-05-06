// ==============================================================================
// LIC v2 — AppHeader (Server Component, F-12 + Phase 17 F1 ThemeToggle)
//
// Header sticky top-0, h-14. 3 zones : Breadcrumb (gauche), ThemeToggle +
// LocaleToggle + NotificationsBell + UserMenu (droite). Reçoit user en prop
// depuis layout. Le thème est lu depuis le cookie `spx-lic.theme` côté
// serveur pour éviter un flash SSR/CSR.
// ==============================================================================

import { cookies } from "next/headers";

import type { AuthUser } from "@/server/infrastructure/auth";

import { Breadcrumb } from "./Breadcrumb";
import { LocaleToggle } from "./LocaleToggle";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export async function AppHeader({ user }: { readonly user: AuthUser }) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("spx-lic.theme")?.value;
  const theme = themeCookie === "light" ? "light" : "dark";

  return (
    <header className="bg-surface-1 border-border sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-6">
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle theme={theme} />
        <LocaleToggle />
        <NotificationsBell />
        <UserMenu display={user.display} role={user.role} />
      </div>
    </header>
  );
}
