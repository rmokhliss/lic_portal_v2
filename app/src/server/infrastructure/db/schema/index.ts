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

// Phase 2.B étape 1/7 : 6 référentiels paramétrables SADMIN (PK serial, ADR 0017).
export { devisesRef } from "@/server/modules/devises/adapters/postgres/schema";
export { languesRef } from "@/server/modules/langues/adapters/postgres/schema";
export { paysRef } from "@/server/modules/pays/adapters/postgres/schema";
export { regionsRef } from "@/server/modules/regions/adapters/postgres/schema";
export { teamMembers } from "@/server/modules/team-members/adapters/postgres/schema";
export { typesContactRef } from "@/server/modules/types-contact/adapters/postgres/schema";

// Phase 4 étape 4.A : 3 tables métier EC-Clients (PK uuidv7, ADR 0005).
export { clients, clientStatut } from "@/server/modules/client/adapters/postgres/schema";
export { contactsClients } from "@/server/modules/contact/adapters/postgres/schema";
export { entites } from "@/server/modules/entite/adapters/postgres/schema";

// Phase 5 étape 5.A : licences + renouvellements (PK uuidv7, version L4).
export { licences, licenceStatus } from "@/server/modules/licence/adapters/postgres/schema";
export {
  renewStatus,
  renouvellements,
} from "@/server/modules/renouvellement/adapters/postgres/schema";

// Phase 6 étape 6.A : catalogue (produits/articles ref) + liaisons + volume history.
export { produitsRef } from "@/server/modules/produit/adapters/postgres/schema";
export { articlesRef } from "@/server/modules/article/adapters/postgres/schema";
export { licenceProduits } from "@/server/modules/licence-produit/adapters/postgres/schema";
export { licenceArticles } from "@/server/modules/licence-article/adapters/postgres/schema";
export { articleVolumeHistory } from "@/server/modules/volume-history/adapters/postgres/schema";
