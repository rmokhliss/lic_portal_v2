// ==============================================================================
// LIC v2 — lic_users (F-06)
//
// Compte utilisateur du portail back-office. Cf. PROJECT_CONTEXT §6 (règles L9
// affichage, L11 permissions, L5 soft delete) et DETTE-002 (must_change_password
// traitée d'entrée v2).
//
// Le compte SYSTEM (UUID nil RFC 9562) est seedé par la migration F-06 elle-même
// pour servir de FK valide à lic_audit_log.user_id pour les actions automatisées
// (jobs pg-boss, scripts internes). Cf. shared/src/constants/system-user.ts.
// ==============================================================================

import {
  type AnyPgColumn,
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";

export const userRole = pgEnum("user_role", ["SADMIN", "ADMIN", "USER"]);

export const users = pgTable(
  "lic_users",
  {
    id: primaryUuid(),
    matricule: varchar("matricule", { length: 20 }).notNull().unique("uq_users_matricule"),
    nom: varchar("nom", { length: 100 }).notNull(),
    prenom: varchar("prenom", { length: 100 }).notNull(),
    email: varchar("email", { length: 200 }).notNull().unique("uq_users_email"),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    // DETTE-002 traitée d'entrée v2 : flag forçant le changement de mot de passe
    // au prochain login (ex: comptes seedés, reset admin).
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    telephone: varchar("telephone", { length: 20 }),
    role: userRole("role").notNull(),
    actif: boolean("actif").notNull().default(true),
    derniereConnexion: timestamp("derniere_connexion", { withTimezone: true }),
    ...timestamps(),
    // Auto-références : annotation `(): AnyPgColumn` requise pour rompre la
    // dépendance cyclique de typage (users référence users.id avant d'être défini).
    creePar: referenceUuid("cree_par", (): AnyPgColumn => users.id),
    modifiePar: referenceUuid("modifie_par", (): AnyPgColumn => users.id),
  },
  (table) => [
    index("idx_users_actif").on(table.actif),
    // FK → index obligatoire (Référentiel §4.15)
    index("idx_users_cree_par").on(table.creePar),
    index("idx_users_modifie_par").on(table.modifiePar),
  ],
);
