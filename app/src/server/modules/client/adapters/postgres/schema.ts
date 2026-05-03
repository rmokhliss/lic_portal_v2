// ==============================================================================
// LIC v2 — lic_clients (Phase 4 étape 4.A — EC-Clients)
//
// Table métier des groupes bancaires / institutions financières clients.
// PK uuidv7 (ADR 0005) — table métier, pas référentiel paramétrable.
//
// FK paramétrables (ADR 0017 — codes business stables) :
//   - code_pays   → lic_pays_ref.code_pays
//   - code_devise → lic_devises_ref.code_devise
//   - code_langue → lic_langues_ref.code_langue (DEFAULT 'fr')
//
// Champs sales_responsable / account_manager : conservés en varchar(100) libre
// pour l'instant (alignement v1, brief 4.A silent sur FK lic_team_members —
// migration normalisée potentiel 4.B).
//
// Soft delete duale : `actif boolean` (v1 legacy) + `statut_client` enum
// (PROSPECT/ACTIF/SUSPENDU/RESILIE — sémantique métier riche). Les deux
// coexistent comme dans data-model v1.
//
// Optimistic locking : `version integer NOT NULL DEFAULT 0` (règle L4 LIC v2).
//
// FTS : search_vector tsvector GENERATED ALWAYS AS (...) STORED — déclaré ici
// en customType minimal pour Drizzle Kit, écrasé par la migration manuelle
// (pattern audit/schema.ts F-06 + DETTE-001 traitée d'entrée v2).
// ==============================================================================

import {
  boolean,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { devisesRef } from "@/server/modules/devises/adapters/postgres/schema";
import { languesRef } from "@/server/modules/langues/adapters/postgres/schema";
import { paysRef } from "@/server/modules/pays/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

// tsvector : pas de type Drizzle natif. customType minimaliste pour Drizzle Kit.
// La colonne est REMPLACÉE par la migration manuelle :
// `ALTER TABLE ... DROP COLUMN search_vector, ADD COLUMN search_vector tsvector
// GENERATED ALWAYS AS (...) STORED`. Pattern repris d'audit/schema.ts.
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

// 4 valeurs alignées data-model v1 ligne 99 (CREATE TYPE client_statut_enum).
export const clientStatut = pgEnum("client_statut_enum", [
  "PROSPECT",
  "ACTIF",
  "SUSPENDU",
  "RESILIE",
]);

export const clients = pgTable(
  "lic_clients",
  {
    id: primaryUuid(),
    codeClient: varchar("code_client", { length: 20 }).notNull().unique("uq_clients_code"),
    raisonSociale: varchar("raison_sociale", { length: 200 }).notNull(),
    nomContact: varchar("nom_contact", { length: 100 }),
    emailContact: varchar("email_contact", { length: 200 }),
    telContact: varchar("tel_contact", { length: 20 }),
    codePays: varchar("code_pays", { length: 2 }).references(() => paysRef.codePays),
    codeDevise: varchar("code_devise", { length: 10 }).references(() => devisesRef.codeDevise),
    codeLangue: varchar("code_langue", { length: 5 })
      .references(() => languesRef.codeLangue)
      .default("fr"),
    salesResponsable: varchar("sales_responsable", { length: 100 }),
    accountManager: varchar("account_manager", { length: 100 }),
    statutClient: clientStatut("statut_client").notNull().default("ACTIF"),
    dateSignatureContrat: date("date_signature_contrat"),
    dateMiseEnProd: date("date_mise_en_prod"),
    dateDemarrageSupport: date("date_demarrage_support"),
    prochaineDateRenouvellementSupport: date("prochaine_date_renouvellement_support"),
    actif: boolean("actif").notNull().default(true),
    version: integer("version").notNull().default(0),
    // ⚠️ Colonne GENERATED ALWAYS STORED après migration manuelle. Ne JAMAIS
    // l'inclure dans un .insert() ou .update() — Postgres rejette. Lecture FTS
    // seule (.where(sql`search_vector @@ to_tsquery(...)`)).
    searchVector: tsvector("search_vector"),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
    modifiePar: referenceUuid("modifie_par", () => users.id),
  },
  (table) => [
    // Soft delete + statut métier — filtres UI fréquents
    index("idx_clients_actif").on(table.actif),
    index("idx_clients_statut").on(table.statutClient),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_clients_code_pays").on(table.codePays),
    index("idx_clients_code_devise").on(table.codeDevise),
    index("idx_clients_code_langue").on(table.codeLangue),
    index("idx_clients_cree_par").on(table.creePar),
    index("idx_clients_modifie_par").on(table.modifiePar),
    // ORDER BY raison_sociale fréquent dans la liste UI
    index("idx_clients_raison_sociale").on(table.raisonSociale),
    // idx_clients_search GIN sur search_vector → ajouté par la migration manuelle.
  ],
);
