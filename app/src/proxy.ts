// ==============================================================================
// LIC v2 — proxy.ts (Next.js 16 — Phase 13.A — CSP nonces production-only)
//
// Objectif : durcir la CSP en prod (CSP Variante A+nonces — cf. ADR 0018) sans
// régresser le DX dev (Turbopack/HMR utilise eval() + scripts inline).
//
// Approche :
//   • NODE_ENV !== 'production' : passe-plat (`NextResponse.next()`).
//     La CSP permissive de `next.config.ts` (`'unsafe-inline'` + `'unsafe-eval'`)
//     reste appliquée — Turbopack HMR & React Refresh fonctionnent normalement.
//   • NODE_ENV === 'production' : génère un nonce par requête (crypto Web Edge
//     runtime) et applique une CSP `script-src 'self' 'nonce-XXX' 'strict-dynamic'`.
//     Cette CSP du proxy SURCHARGE celle de `next.config.ts` (les headers du
//     proxy sont mergés avec ceux de `next.config.ts`, le proxy gagne sur les
//     clés en doublon — comportement standard Next.js).
//
// Convention Next.js 16 : `proxy.ts` (au lieu de `middleware.ts` deprecated en
// v16). Source : `node_modules/next/dist/build/templates/middleware.js.map` —
// `const isProxy = page === '/proxy' || page === '/src/proxy'` puis
// `(isProxy ? mod.proxy : mod.middleware) || mod.default`. Les deux conventions
// coexistent encore pour rétrocompatibilité.
//
// Nonce → Server Components : exposé via `request.headers['x-nonce']` qu'un
// layout serveur peut lire avec `headers().get('x-nonce')` pour injecter le
// nonce dans les <script> inline de l'app si besoin futur. LIC v2 n'a pas de
// <script> custom inline — Next.js gère lui-même le bootstrap RSC qui fonctionne
// avec `'strict-dynamic'` + nonce sur les scripts qu'il injecte automatiquement.
//
// Pas de signing nonce ni rotation : un nonce par requête est régénéré par le
// proxy à chaque hit. Pas de stockage côté serveur, pas d'exposition (le nonce
// est dans le header CSP de la réponse, public par design CSP).
// ==============================================================================

import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  // Garde NODE_ENV : en dev (incl. test), passe-plat. La CSP permissive de
  // next.config.ts (unsafe-inline + unsafe-eval) reste appliquée — compatible
  // Turbopack HMR + eval() pour React Refresh.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  // Edge runtime : `crypto.randomUUID()` + `btoa()` disponibles (Web Crypto API).
  const nonce = btoa(crypto.randomUUID());

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Phase 24 — fonts.googleapis.com whitelisté (Montserrat DS SELECT-PX).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    // Phase 24 — fonts.gstatic.com (woff2 Montserrat).
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspDirectives);
  return response;
}

// Matcher : on exclut `/api/*` (les Server Actions et endpoints API n'ont pas
// besoin d'une CSP HTML — leur protection est applicative côté Server Action),
// les assets statiques `_next/static`, les images `_next/image`, et le favicon.
// Conséquence : seuls les rendus HTML (pages App Router) reçoivent la CSP nonce.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
