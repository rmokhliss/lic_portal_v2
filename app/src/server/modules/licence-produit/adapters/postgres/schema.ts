// ==============================================================================
// LIC v2 — lic_licence_produits (Phase 6 étape 6.A)
//
// Liaison N:N licence ↔ produit. PK uuidv7. UNIQUE (licence_id, produit_id)
// : un produit ne peut être attaché qu'une fois par licence.
//
// Audit obligatoire (mutation contrat de licence = entité métier).
// ==============================================================================

import { index, integer, pgTable, timestamp, unique } from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";
import { produitsRef } from "@/server/modules/produit/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const licenceProduits = pgTable(
  "lic_licence_produits",
  {
    id: primaryUuid(),
    licenceId: referenceUuid("licence_id", () => licences.id).notNull(),
    produitId: integer("produit_id")
      .notNull()
      .references(() => produitsRef.id),
    dateAjout: timestamp("date_ajout", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
  },
  (table) => [
    unique("uq_licence_produits_licence_produit").on(table.licenceId, table.produitId),
    index("idx_licence_produits_licence").on(table.licenceId),
    index("idx_licence_produits_produit").on(table.produitId),
    index("idx_licence_produits_cree_par").on(table.creePar),
  ],
);
