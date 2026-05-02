// ==============================================================================
// LIC v2 — Barrel des schémas Drizzle (consommé par client.ts)
//
// Re-exporte les tables et enums déclarés dans chaque module métier :
//   modules/<X>/adapters/postgres/schema.ts est la SURFACE PUBLIQUE cross-module
//   du module X. Le reste de l'adapter Postgres (repository.pg.ts, mapper.ts)
//   reste privé au module.
//
// Drizzle Kit lit aussi le wildcard ./src/server/modules/*/adapters/postgres/
// schema.ts (cf. drizzle.config.ts) pour générer les migrations ; ce barrel
// donne au runtime Drizzle l'accès typé aux tables.
// ==============================================================================

// F-06 : 3 modules système (user, audit, settings).
export { auditLog, auditMode } from "@/server/modules/audit/adapters/postgres/schema";
export { settings } from "@/server/modules/settings/adapters/postgres/schema";
export { userRole, users } from "@/server/modules/user/adapters/postgres/schema";
