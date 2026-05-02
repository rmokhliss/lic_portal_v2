// ==============================================================================
// LIC v2 — SidebarLink (Client Component, F-12)
//
// Lien sidebar avec highlight de l'item actif via usePathname() (Client
// Component obligatoire — usePathname est un hook).
//
// L'icône est passée déjà rendue (ReactNode) par le parent Server Component :
// les composants Lucide sont des fonctions, non sérialisables cross-boundary
// server→client. Cf. https://nextjs.org/docs/app/getting-started/server-and-client-components
// ==============================================================================

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SidebarLinkProps {
  readonly href: string;
  readonly icon: ReactNode;
  readonly label: string;
}

export function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  // Highlight si exact match. Pas de match préfixe pour éviter qu'/ ne
  // surligne sur toutes les sous-pages.
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 font-sans text-sm transition-colors",
        isActive
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
