// ==============================================================================
// LIC v2 — UserMenu (Client Component, F-12)
//
// Dropdown header : nom L9 + rôle + lien profil + logout (Server Action).
// ==============================================================================

"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

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
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut className="size-4" />
              <span>{t("logout.label")}</span>
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
