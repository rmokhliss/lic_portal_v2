// ==============================================================================
// LIC v2 — lic_audit_log (F-06)
//
// Trace toute mutation métier (règle L3 : audit obligatoire dans la même
// transaction). DETTE-001 traitée d'entrée v2 : user_display + client_display
// dénormalisés et inclus dans search_vector pour FTS performant.
//
// Champs dénormalisés (user_display, client_display) : règle L9 affichage
// "Prénom NOM (MAT-XXX)". Captés au moment de l'écriture audit, pas recomputés.
//
// search_vector : déclaré ici comme tsvector simple (Drizzle n'a pas de support
// natif des colonnes GENERATED). La migration F-06 ÉCRASE cette colonne pour la
// recréer en GENERATED ALWAYS AS (...) STORED + index GIN. Cf. la migration.
//
// FK lic_clients : non posée (table lic_clients créée en Phase 4 EC-Clients).
// On stocke client_id en uuid simple. La FK sera ajoutée par une migration
// ultérieure quand lic_clients existera.
// ==============================================================================

import { customType, index, jsonb, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { createdAtOnly, primaryUuid, referenceUuid } from "@/server/infrastructure/db/columns";
import { users } from "@/server/modules/user/adapters/postgres/schema";

// tsvector : pas de type Drizzle natif. customType minimaliste pour Drizzle Kit.
// La colonne est REMPLACÉE par la migration F-06 manuelle :
// `ALTER TABLE ... DROP COLUMN search_vector, ADD COLUMN search_vector tsvector
// GENERATED ALWAYS AS (...) STORED`.
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

// 4 valeurs :
//   MANUEL = action déclenchée par un utilisateur authentifié via l'UI
//   API    = action déclenchée par un appel API tiers (réservé futur)
//   JOB    = action déclenchée par un job pg-boss (user_id = SYSTEM)
//   SEED   = ajout Phase 4.D — déclenché par pnpm db:seed (user_id = SYSTEM,
//            non-CI uniquement). Distingue les données de démo des actions
//            réelles dans le journal.
export const auditMode = pgEnum("audit_mode", ["MANUEL", "API", "JOB", "SEED"]);

export const auditLog = pgTable(
  "lic_audit_log",
  {
    id: primaryUuid(),
    entity: varchar("entity", { length: 30 }).notNull(),
    // entityId : uuid pointant vers des tables variables selon `entity`
    // (lic_clients, lic_licences, etc.) — pas de FK fixe possible.
    entityId: uuid("entity_id").notNull(),
    action: varchar("action", { length: 30 }).notNull(),
    beforeData: jsonb("before_data").$type<Record<string, unknown>>(),
    afterData: jsonb("after_data").$type<Record<string, unknown>>(),
    // FK vers lic_users : SYSTEM = nil UUID seedé (cf. règle L6, options Stop #1).
    userId: referenceUuid("user_id", () => users.id).notNull(),
    userDisplay: varchar("user_display", { length: 200 }), // dénormalisé FTS
    // clientId : uuid sans FK Drizzle (lic_clients pas encore créée à F-06).
    clientId: uuid("client_id"),
    clientDisplay: varchar("client_display", { length: 200 }), // dénormalisé FTS
    ipAddress: varchar("ip_address", { length: 45 }), // 45 chars couvrent IPv6
    mode: auditMode("mode").notNull().default("MANUEL"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // ⚠️ Colonne GENERATED ALWAYS STORED côté BD (cf. migration F-06).
    // Ne JAMAIS l'inclure dans un .insert() ou .update() — Postgres rejette
    // ("cannot insert a non-DEFAULT value into column ..."). Lecture/recherche
    // seule (.where(sql`search_vector @@ to_tsquery(...)`)).
    searchVector: tsvector("search_vector"),
    ...createdAtOnly(),
  },
  (table) => [
    // Recherche par entité (entity + entity_id) — patron WHERE le plus fréquent
    index("idx_audit_entity").on(table.entity, table.entityId),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_audit_user").on(table.userId),
    // ORDER BY DESC quasi systématique sur les listes audit
    index("idx_audit_created_at").on(table.createdAt),
    // idx_audit_search GIN sur search_vector → ajouté par la migration manuelle.
  ],
);
