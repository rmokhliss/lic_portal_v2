// ==============================================================================
// LIC v2 — lic_entites (Phase 4 étape 4.A — EC-Clients)
//
// Niveau intermédiaire client → entité → licence. Une entité est une filiale
// géographique, une sous-banque ou un périmètre produit distinct (data-model
// v1 §lic_entites).
//
// PK uuidv7 (ADR 0005). Soft delete via `actif boolean` (data-model v1 ne
// prévoit PAS de version optimistic locking sur les entités — alignement
// strict v1, à réévaluer si concurrence côté UI le justifie en Phase 4.B+).
//
// FK paramétrable :
//   - code_pays → lic_pays_ref.code_pays (NULL si identique au client parent)
//
// FK lic_clients : NOT NULL (une entité appartient TOUJOURS à un client).
// ON DELETE RESTRICT par défaut Drizzle — un client avec entités ne peut pas
// être hard-delete (cohérent règle L5 soft delete LIC v2).
//
// UNIQUE (client_id, nom) : pas de doublon d'entité par client (data-model v1).
// ==============================================================================

import { boolean, index, pgTable, unique, varchar } from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { clients } from "@/server/modules/client/adapters/postgres/schema";
import { paysRef } from "@/server/modules/pays/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const entites = pgTable(
  "lic_entites",
  {
    id: primaryUuid(),
    clientId: referenceUuid("client_id", () => clients.id).notNull(),
    nom: varchar("nom", { length: 200 }).notNull(),
    codePays: varchar("code_pays", { length: 2 }).references(() => paysRef.codePays),
    actif: boolean("actif").notNull().default(true),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
    modifiePar: referenceUuid("modifie_par", () => users.id),
  },
  (table) => [
    // Pas de doublon d'entité par client (data-model v1 ligne 497)
    unique("uq_entites_client_nom").on(table.clientId, table.nom),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_entites_client").on(table.clientId),
    index("idx_entites_code_pays").on(table.codePays),
    index("idx_entites_actif").on(table.actif),
    index("idx_entites_cree_par").on(table.creePar),
    index("idx_entites_modifie_par").on(table.modifiePar),
  ],
);
