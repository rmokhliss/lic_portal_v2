// ==============================================================================
// LIC v2 — Barrel des schémas Drizzle (consommé par client.ts)
//
// Vide à F-05. Sera enrichi en F-06+ par re-exports depuis :
//   app/src/server/modules/<X>/adapters/postgres/schema.ts
//
// Drizzle Kit lit le wildcard ./src/server/modules/*/adapters/postgres/schema.ts
// (cf. drizzle.config.ts) ; le code applicatif lit ce barrel (API stable) via
// l'instance Drizzle exportée par client.ts.
// ==============================================================================

export {};
