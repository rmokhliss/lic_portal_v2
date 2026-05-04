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
// (cf. §4.16).
//
// CSP — Variante A+nonces (Phase 13.A — ADR 0018 — DETTE-LIC-004 résolue) :
//   • DEV : CSP permissive ci-dessous (unsafe-inline + unsafe-eval) — requise
//     par Turbopack HMR + React Refresh (eval) et le bootstrap RSC inline.
//   • PROD : `app/src/proxy.ts` génère un nonce par requête et SURCHARGE le
//     header CSP de cette config (script-src 'self' 'nonce-XXX' 'strict-dynamic').
//     Le proxy étant gardé par `NODE_ENV !== 'production'`, en dev la CSP
//     restrictive ne s'applique pas — pas d'impact sur le DX.
//
// Justification 'unsafe-inline' pour script-src (DEV uniquement) : Next.js 16 +
// React Server Components injectent des <script> inline pour le bootstrap client.
// Justification 'unsafe-eval' (DEV uniquement) : Turbopack HMR utilise eval().
// Justification 'unsafe-inline' pour style-src : Tailwind 4 + shadcn/ui + Radix
// injectent des <style> inline (variantes de classes, animations) — conservé
// en prod aussi car le coût d'éliminer style-inline est disproportionné.
//
// connect-src 'self' : OK en Phase 2.A (OTel Web sans exporter OTLP externe,
// cf. OtelProvider.tsx). À étendre Phase 13.x quand collector OTLP déployé.
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
