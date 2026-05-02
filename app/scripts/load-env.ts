// ==============================================================================
// LIC v2 — Loader .env pour les scripts CLI hors Next.js (drizzle-kit, etc.)
//
// Importé en PREMIER (side-effect) dans drizzle.config.ts pour que les imports
// suivants (notamment infrastructure/env) trouvent les variables remplies.
//
// Sans ce loader, drizzle-kit crashe : il n'a pas de mécanisme intégré de
// chargement .env, contrairement à Next.js (`next dev`) qui le fait nativement.
//
// `process.loadEnvFile` est natif Node 21.7+ (zero dépendance). Le path est
// relatif au CWD du script, donc `../.env` car drizzle-kit s'exécute depuis app/.
// ==============================================================================

process.loadEnvFile("../.env");
