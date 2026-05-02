// ==============================================================================
// LIC v2 — Auth.js v5 entry point + helpers serveur (F-07)
//
// Exports publics :
//   - handlers, auth, signIn, signOut : ré-exports Auth.js
//   - 6 helpers (requireAuth, requireAuthPage, requireRole, requireRolePage,
//     getCurrentUser, requireAuthForChangePassword)
//   - bootstrapAdmin : appelé par instrumentation.ts au boot
//   - Types : AuthUser, AuthRole
// ==============================================================================

import { redirect } from "next/navigation";
import NextAuth from "next-auth";

import { ForbiddenError, UnauthorizedError } from "@/server/modules/error";

import { authConfig } from "./config";
import { bootstrapAdmin } from "./bootstrap-admin";
import type { AuthRole } from "./types";

// Module augmentation Auth.js (side-effect import, types globaux).
import "./types";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export type { AuthRole } from "./types";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly display: string;
  readonly role: AuthRole;
  readonly mustChangePassword: boolean;
  readonly tokenVersion: number;
}

function isUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.role === "string";
}

// ============================================================================
// Helpers serveur
// ============================================================================

/** Server Actions. Throw UnauthorizedError SPX-LIC-001 si pas de session. */
export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session || !isUser(session.user)) {
    throw new UnauthorizedError({ code: "SPX-LIC-001" });
  }
  return session.user;
}

/** Server Components. Pas de session → redirect /login. mustChangePassword
 *  → redirect /profile/change-password (sauf si déjà sur cette page : utiliser
 *  requireAuthForChangePassword à la place pour cette route précise). */
export async function requireAuthPage(): Promise<AuthUser> {
  const session = await auth();
  if (!session || !isUser(session.user)) {
    redirect("/login");
  }
  if (session.user.mustChangePassword) {
    redirect("/profile/change-password");
  }
  return session.user;
}

/** Variante pour la page /profile/change-password elle-même.
 *  Ne fait PAS le redirect mustChangePassword (sinon boucle infinie).
 *  À utiliser EXCLUSIVEMENT dans cette page. */
export async function requireAuthForChangePassword(): Promise<AuthUser> {
  const session = await auth();
  if (!session || !isUser(session.user)) {
    redirect("/login");
  }
  return session.user;
}

/** Server Actions. requireAuth + check role inclus, sinon ForbiddenError. */
export async function requireRole(roles: readonly AuthRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError({ code: "SPX-LIC-003" });
  }
  return user;
}

/** Server Components. requireAuthPage + check role, sinon redirect("/")
 *  (règle L14 forbidden gracieux). */
export async function requireRolePage(roles: readonly AuthRole[]): Promise<AuthUser> {
  const user = await requireAuthPage();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}

/** Server Components / Actions. Retourne user ou null sans throw ni redirect. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session || !isUser(session.user)) return null;
  return session.user;
}

export { bootstrapAdmin };
