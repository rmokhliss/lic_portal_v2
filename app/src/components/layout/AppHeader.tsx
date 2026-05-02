// ==============================================================================
// LIC v2 — AppHeader (Server Component, F-12)
//
// Header sticky top-0, h-14. 3 zones : Breadcrumb (gauche), LocaleToggle +
// NotificationsBell + UserMenu (droite). Reçoit user en prop depuis layout.
// ==============================================================================

import type { AuthUser } from "@/server/infrastructure/auth";

import { Breadcrumb } from "./Breadcrumb";
import { LocaleToggle } from "./LocaleToggle";
import { NotificationsBell } from "./NotificationsBell";
import { UserMenu } from "./UserMenu";

export function AppHeader({ user }: { readonly user: AuthUser }) {
  return (
    <header className="bg-surface-1 border-border sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-6">
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <LocaleToggle />
        <NotificationsBell />
        <UserMenu display={user.display} role={user.role} />
      </div>
    </header>
  );
}
