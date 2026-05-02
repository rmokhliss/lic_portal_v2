// ==============================================================================
// LIC v2 — Dashboard layout (Server Component, F-12)
//
// Wrap toutes les pages du route group (dashboard)/ : sidebar fixe + header
// sticky. Auth check via requireAuthPage() — c'est le SEUL point de garde
// d'authentification (le middleware Edge a été retiré au profit du check
// server-side dans ce layout, cf. PROJECT_CONTEXT_LIC.md §10 retrait).
// ==============================================================================

import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { requireAuthPage } from "@/server/infrastructure/auth";

export default async function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const user = await requireAuthPage();

  return (
    <div className="bg-background min-h-screen">
      <AppSidebar userRole={user.role} />
      <div className="ml-64 flex min-h-screen flex-col">
        <AppHeader user={user} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
