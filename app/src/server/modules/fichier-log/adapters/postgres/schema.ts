// ==============================================================================
// LIC v2 — lic_fichiers_log (Phase 10 étape 10.A)
//
// Append-only : trace les fichiers générés (.lic) et importés (healthcheck).
// PK uuidv7. Pas d'audit (DEC-019 — la table EST la trace, pas un événement
// métier mutable).
//
// `hash` : SHA256 hex (64 chars). Permet vérification d'intégrité au moment
// du téléchargement / import.
//
// `path` : chemin relatif côté serveur (Phase 10 stub — Phase 13+ stockage
// objet S3/MinIO). Pour Phase 10.C/D : path local /tmp ou data/ (à clarifier
// en prod). À ce stade : la valeur est tracée mais le stockage physique du
// fichier n'est pas implémenté (la génération retourne la string + hash, le
// fichier n'est pas écrit sur disque).
// ==============================================================================

import { index, jsonb, pgEnum, pgTable, text, varchar } from "drizzle-orm/pg-core";

import { createdAtOnly, primaryUuid, referenceUuid } from "@/server/infrastructure/db/columns";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";
import { users } from "@/server/modules/user/adapters/postgres/schema";

export const fichierType = pgEnum("fichier_type_enum", ["LIC_GENERATED", "HEALTHCHECK_IMPORTED"]);

export const fichierStatut = pgEnum("fichier_statut_enum", ["GENERATED", "IMPORTED", "ERREUR"]);

export const fichiersLog = pgTable(
  "lic_fichiers_log",
  {
    id: primaryUuid(),
    licenceId: referenceUuid("licence_id", () => licences.id).notNull(),
    type: fichierType("type").notNull(),
    statut: fichierStatut("statut").notNull(),
    /** Chemin logique (ex: "lic/{ref}-{timestamp}.lic" ou
     *  "healthcheck/{ref}-{timestamp}.json"). Stub Phase 10 — pas
     *  nécessairement matérialisé sur disque. */
    path: varchar("path", { length: 500 }).notNull(),
    /** SHA256 hex (64 chars). */
    hash: varchar("hash", { length: 64 }).notNull(),
    /** Métadonnées libres : pour HEALTHCHECK_IMPORTED, contient le résumé
     *  (nb articles updated, nb errors). Pour LIC_GENERATED, vide ou
     *  payload résumé. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    /** Message d'erreur si statut = ERREUR. */
    errorMessage: text("error_message"),
    creePar: referenceUuid("cree_par", () => users.id),
    ...createdAtOnly(),
  },
  (table) => [
    index("idx_fichiers_log_licence").on(table.licenceId, table.createdAt),
    index("idx_fichiers_log_type").on(table.type),
  ],
);
