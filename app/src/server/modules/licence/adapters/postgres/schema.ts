// ==============================================================================
// LIC v2 — lic_licences (Phase 5 étape 5.A)
//
// Contrat de licence entre S2M et une entité bancaire.
// PK uuidv7 (ADR 0005). Optimistic locking via `version` (règle L4).
//
// FK :
//   - client_id   → lic_clients.id  (dénormalisé pour filtrage rapide)
//   - entite_id   → lic_entites.id  (entité propriétaire)
//   - cree_par / modifie_par → lic_users.id
//
// reference : varchar(30) UNIQUE, format LIC-{YYYY}-{NNN} auto-généré côté
// repo via allocateNextReference (cf. licence.repository.pg.ts). Contrainte
// CHECK reference matche le pattern.
//
// Pas de FTS (skip cf. brief 5 — filtres simples par statut/client/dates).
// Pas de FK directe vers lic_produits_ref / lic_articles_ref : la jointure
// licence ↔ catalogue passe par les tables de liaison Phase 6.
// ==============================================================================

import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { clients } from "@/server/modules/client/adapters/postgres/schema";
import { entites } from "@/server/modules/entite/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

// 4 valeurs alignées data-model v1 (CREATE TYPE licence_status_enum).
export const licenceStatus = pgEnum("licence_status_enum", [
  "ACTIF",
  "INACTIF",
  "SUSPENDU",
  "EXPIRE",
]);

export const licences = pgTable(
  "lic_licences",
  {
    id: primaryUuid(),
    reference: varchar("reference", { length: 30 }).notNull().unique("uq_licences_reference"),
    clientId: referenceUuid("client_id", () => clients.id).notNull(),
    entiteId: referenceUuid("entite_id", () => entites.id).notNull(),
    dateDebut: timestamp("date_debut", { withTimezone: true }).notNull(),
    dateFin: timestamp("date_fin", { withTimezone: true }).notNull(),
    status: licenceStatus("status").notNull().default("ACTIF"),
    commentaire: varchar("commentaire", { length: 1000 }),
    version: integer("version").notNull().default(0),
    renouvellementAuto: boolean("renouvellement_auto").notNull().default(false),
    notifEnvoyee: boolean("notif_envoyee").notNull().default(false),
    // Phase 23 — empreinte SHA-256 du contenu produit/article/volume au moment
    // de la dernière génération .lic. Permet de détecter qu'un fichier .lic
    // est obsolète (modifications post-génération → bannière UI). NULL tant
    // qu'aucun .lic n'a été généré pour cette licence.
    lastLicFileHash: varchar("last_lic_file_hash", { length: 64 }),
    lastLicFileGeneratedAt: timestamp("last_lic_file_generated_at", { withTimezone: true }),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
    modifiePar: referenceUuid("modifie_par", () => users.id),
  },
  (table) => [
    // CHECK : date_fin > date_debut + reference au format LIC-{YYYY}-{NNN}
    check("ck_licences_date_fin_apres_debut", sql`${table.dateFin} > ${table.dateDebut}`),
    check("ck_licences_reference_format", sql`${table.reference} ~ '^LIC-[0-9]{4}-[0-9]{3,}$'`),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_licences_client").on(table.clientId),
    index("idx_licences_entite").on(table.entiteId),
    index("idx_licences_cree_par").on(table.creePar),
    index("idx_licences_modifie_par").on(table.modifiePar),
    // Filtres UI fréquents
    index("idx_licences_status").on(table.status),
    index("idx_licences_date_fin").on(table.dateFin),
  ],
);
