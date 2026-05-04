// ==============================================================================
// LIC v2 — lic_alert_configs (Phase 8 étape 8.A)
//
// Configuration d'alerte attachée à un client. Définit les seuils volumétrie/
// dates qui déclenchent une notification quand le job check-alerts détecte
// un dépassement. PK uuidv7 (entité métier — règle audit obligatoire).
//
// Champs :
//   - client_id        : portée (FK lic_clients)
//   - libelle          : nom métier de la règle
//   - canaux           : ['IN_APP'] (Phase 8) — futur : 'EMAIL', 'SMS'
//   - seuil_volume_pct : déclenche si vol_consomme/vol_autorise >= ce pct
//   - seuil_date_jours : déclenche si date_fin - NOW() <= ces jours
//   - actif            : on/off de la règle
// ==============================================================================

import { boolean, integer, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";

import { primaryUuid, referenceUuid, timestamps } from "@/server/infrastructure/db/columns";
import { clients } from "@/server/modules/client/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const alertChannel = pgEnum("alert_channel_enum", ["IN_APP", "EMAIL", "SMS"]);

export const alertConfigs = pgTable("lic_alert_configs", {
  id: primaryUuid(),
  clientId: referenceUuid("client_id", () => clients.id).notNull(),
  libelle: varchar("libelle", { length: 200 }).notNull(),
  /** Tableau de canaux. Stocké en text[] côté PG via varchar[] Drizzle. */
  canaux: alertChannel("canaux").array().notNull().default(["IN_APP"]),
  seuilVolumePct: integer("seuil_volume_pct"),
  seuilDateJours: integer("seuil_date_jours"),
  actif: boolean("actif").notNull().default(true),
  ...timestamps(),
  creePar: referenceUuid("cree_par", () => users.id),
  modifiePar: referenceUuid("modifie_par", () => users.id),
});
