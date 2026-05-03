// ==============================================================================
// LIC v2 — lic_contacts_clients (Phase 4 étape 4.A — EC-Clients)
//
// Contacts d'un client (multi-type : ACHAT, FACTURATION, TECHNIQUE, JURIDIQUE,
// DIRECTION, …). Le `type_contact_code` est une FK vers lic_types_contact_ref
// (référentiel SADMIN, ADR 0017).
//
// ⚠️ DIVERGENCE explicite vs data-model v1 ligne 563 :
//   v1 : client_id integer FK → lic_clients ON DELETE CASCADE
//   v2 : entite_id uuid    FK → lic_entites  ON DELETE CASCADE  (brief 4.A)
//
// Justification v2 : un contact est attaché à une entité opérationnelle (ex:
// le contact technique est un agent de la filiale, pas du holding). Si une
// entité est supprimée, ses contacts disparaissent en cascade. Le rattachement
// au client est dérivé via entite.clientId.
//
// PK uuidv7 (ADR 0005). Soft delete via `actif boolean` (cohérent v1).
// Pas de UNIQUE (client_id, type) : un client peut avoir plusieurs contacts
// d'un même type (ex: 2 contacts ACHAT pour 2 sites).
// ==============================================================================

import { boolean, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { entites } from "@/server/modules/entite/adapters/postgres/schema";
import { typesContactRef } from "@/server/modules/types-contact/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const contactsClients = pgTable(
  "lic_contacts_clients",
  {
    id: primaryUuid(),
    // CASCADE explicite : drop d'une entité supprime ses contacts (brief 4.A).
    // Le helper referenceUuid n'expose pas l'option onDelete — uuid() direct ici.
    entiteId: uuid("entite_id")
      .references(() => entites.id, { onDelete: "cascade" })
      .notNull(),
    typeContactCode: varchar("type_contact_code", { length: 30 })
      .notNull()
      .references(() => typesContactRef.code),
    nom: varchar("nom", { length: 100 }).notNull(),
    prenom: varchar("prenom", { length: 100 }),
    email: varchar("email", { length: 200 }),
    telephone: varchar("telephone", { length: 20 }),
    actif: boolean("actif").notNull().default(true),
    ...timestamps(),
    creePar: referenceUuid("cree_par", () => users.id),
    modifiePar: referenceUuid("modifie_par", () => users.id),
  },
  (table) => [
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_contacts_clients_entite").on(table.entiteId),
    index("idx_contacts_clients_type").on(table.typeContactCode),
    index("idx_contacts_clients_actif").on(table.actif),
    index("idx_contacts_clients_cree_par").on(table.creePar),
    index("idx_contacts_clients_modifie_par").on(table.modifiePar),
  ],
);
