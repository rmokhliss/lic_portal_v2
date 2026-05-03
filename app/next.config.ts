import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl 4.x convention : pointer vers le fichier getRequestConfig
// (Server Components SSR config). Path relatif au workspace app/.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// =========================================================================
// Headers HTTP de sécurité — Référentiel S2M v2.1 §4.16 (F-15)
//
// Les 6 headers exigés par le Référentiel sont appliqués sur toutes les
// routes via `headers()`. Absence = échec systématique d'un pentest bancaire
// (cf. §4.16). Le Référentiel précise pour CSP : « Démarrer en mode
// Report-Only puis enforcer ». LIC v2 démarre directement en mode enforcé
// avec une CSP permissive sur les scripts/styles inline (compatibilité
// Next.js 16 sans nonces). Migration vers une CSP basée sur nonces +
// middleware = DETTE-LIC-004 (à ouvrir, voir PROJECT_CONTEXT §10).
//
// Justification 'unsafe-inline' pour script-src : Next.js 16 + React Server
// Components injectent des <script> inline pour le bootstrap client
// (__next_f.push, etc.). Sans nonce ni 'unsafe-inline', l'app ne fonctionne
// pas. F-12 a supprimé middleware.ts (DETTE-LIC-002 sans objet) ;
// ré-introduire un middleware uniquement pour générer un nonce CSP serait
// disproportionné vis-à-vis du gain de sécurité pour un back-office interne
// mono-tenant.
//
// Justification 'unsafe-eval' : Turbopack (Next.js 16 dev) utilise eval()
// pour le HMR. CSP unifiée dev+prod pour éviter les divergences de
// comportement (cf. §4.7 — pas de comportement dépendant de NODE_ENV dans
// les configs architecturales). Note Phase 13 : 'unsafe-eval' n'est pas
// requis par le build prod minifié ; durcir alors la CSP en différenciant
// dev/prod via variable d'env (DETTE-LIC-004 inclut ce durcissement).
//
// Justification 'unsafe-inline' pour style-src : Tailwind 4 + shadcn/ui +
// Radix injectent des <style> inline (variantes de classes, animations).
//
// connect-src 'self' : OK en Phase 2.A (OTel Web sans exporter OTLP externe,
// cf. OtelProvider.tsx). À étendre Phase 13 quand collector OTLP déployé.
// =========================================================================
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
