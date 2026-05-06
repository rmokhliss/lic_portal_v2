// ==============================================================================
// LIC v2 — UserMenu (Client Component, F-12 + Phase 19+ logout fix)
//
// Dropdown header : nom L9 + rôle + lien profil + logout (Server Action).
//
// Phase 19+ fix logout — l'ancien pattern `<form action={signOutAction}>`
// imbriqué dans `<DropdownMenuItem asChild>` ne déclenchait pas la Server
// Action : Radix DropdownMenu intercepte le `onSelect` du Item pour fermer
// le menu, ce qui empêche le form submit de propager. Remplacé par un
// handler `onSelect` direct qui appelle `signOutAction` via useTransition.
// `signOut()` Auth.js throw NEXT_REDIRECT — intercepté par le runtime
// Next.js qui redirige le navigateur vers /login.
// ==============================================================================

"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useTransition } from "react";

import { signOutAction } from "@/app/(dashboard)/_actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserMenuProps {
  /** "Prénom NOM (MAT-XXX)" — règle L9. */
  readonly display: string;
  readonly role: "SADMIN" | "ADMIN" | "USER";
}

export function UserMenu({ display, role }: UserMenuProps) {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();

  const onLogout = () => {
    startTransition(() => {
      void (async () => {
        await signOutAction();
      })();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="font-mono text-xs">
          <User className="size-4" />
          <span>{display}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
          {role}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="size-4" />
            <span>Mon profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} disabled={pending} className="cursor-pointer">
          <LogOut className="size-4" />
          <span>{t("logout.label")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
