// ==============================================================================
// LIC v2 — lic_renouvellements (Phase 5 étape 5.A)
//
// Renouvellement d'un contrat de licence : nouvelle période + statut workflow.
// Statut : EN_COURS (créé, en attente de validation) → VALIDE (renouvellement
// confirmé, nouvelle licence créée) | ANNULE (refusé). CREE = renouvellement
// automatique via job (Phase 9).
//
// PK uuidv7 (ADR 0005). FK lic_licences ON DELETE RESTRICT (préserve trace).
// ==============================================================================

import { check, index, pgEnum, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const renewStatus = pgEnum("renew_status_enum", ["EN_COURS", "VALIDE", "CREE", "ANNULE"]);

export const renouvellements = pgTable(
  "lic_renouvellements",
  {
    id: primaryUuid(),
    licenceId: referenceUuid("licence_id", () => licences.id).notNull(),
    nouvelleDateDebut: timestamp("nouvelle_date_debut", { withTimezone: true }).notNull(),
    nouvelleDateFin: timestamp("nouvelle_date_fin", { withTimezone: true }).notNull(),
    status: renewStatus("status").notNull().default("EN_COURS"),
    commentaire: varchar("commentaire", { length: 1000 }),
    valideePar: referenceUuid("validee_par", () => users.id),
    dateValidation: timestamp("date_validation", { withTimezone: true }),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
  },
  (table) => [
    check(
      "ck_renouv_date_fin_apres_debut",
      sql`${table.nouvelleDateFin} > ${table.nouvelleDateDebut}`,
    ),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_renouvellements_licence").on(table.licenceId),
    index("idx_renouvellements_cree_par").on(table.creePar),
    index("idx_renouvellements_valide_par").on(table.valideePar),
    index("idx_renouvellements_status").on(table.status),
  ],
);
