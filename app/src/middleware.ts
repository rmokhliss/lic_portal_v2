// ==============================================================================
// LIC v2 — Middleware Next.js (F-11) — fusion next-intl + Auth.js redirect
//
// Ordre d'exécution :
//   1. next-intl/middleware : détecte la locale via cookie NEXT_LOCALE
//      (default FR, fallback FR si invalide). Pas de préfixe URL — le cookie
//      est la seule source de vérité.
//   2. Auth.js (NextAuth.auth()) : check session sur les routes protégées.
//      Si pas de session → redirect /login.
//
// Routes publiques (skip auth check) :
//   /login, /forgot-password, /reset-password, /api/auth/*, /api/health
//
// Routes protégées : tout le reste (matcher config exclut les statics).
//
// Convention emplacement : app/src/middleware.ts (cohérent instrumentation.ts
// dans src/, vs app/middleware.ts à la racine — Next.js 16 supporte les deux).
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { auth } from "@/server/infrastructure/auth";

const intlMiddleware = createIntlMiddleware({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localeDetection: true,
  // Pas de préfixe URL — locale via cookie NEXT_LOCALE uniquement.
  localePrefix: "never",
});

const PUBLIC_ROUTES = new Set<string>(["/login", "/forgot-password", "/reset-password"]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/health") return true;
  return false;
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. next-intl en premier : positionne la locale dans la response
  //    (cookie NEXT_LOCALE). Le passe-plat retourne soit la response avec
  //    cookie set, soit un redirect (ex: locale invalide → fallback).
  const intlResponse = intlMiddleware(request);

  // 2. Skip auth check sur routes publiques + statics (matcher exclut déjà
  //    /_next, /favicon, etc., mais on garde la garde explicite par sécurité).
  if (isPublicRoute(pathname)) {
    return intlResponse;
  }

  // Auth.js v5 strategy JWT — décode le cookie sans appel BD.
  // Compatible Edge runtime. Si database strategy ajoutée un jour,
  // ce middleware devra migrer vers Node runtime (config runtime = "nodejs").
  const session = await auth();
  if (!session) {
    // Redirect vers /login (la locale est déjà positionnée dans intlResponse
    // mais on génère une nouvelle response — Next.js conservera le cookie
    // NEXT_LOCALE déjà présent côté browser).
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Session OK : on retourne la response intl (cookie locale) tel quel.
  return intlResponse;
}

// Matcher : exclut explicitement les statics + favicon. Tous les autres
// chemins passent par le middleware (incl. /api/auth/* qu'on gère via
// isPublicRoute).
export const config = {
  matcher: [
    /*
     * Match tous les chemins sauf :
     * - _next/static, _next/image (assets internes Next)
     * - favicon.ico
     * - fichiers avec extension (images, fonts, css, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]*$).*)",
  ],
};
