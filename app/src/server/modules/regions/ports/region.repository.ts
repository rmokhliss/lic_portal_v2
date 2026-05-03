// ==============================================================================
// LIC v2 — Port RegionRepository (Phase 2.B étape 2/7)
//
// Surface 4 méthodes (Référentiel §4.12.2 — abstract class, pas interface) :
//   - findAll(opts?, tx?)        : liste complète, filtre `actif` optionnel
//   - findByCode(code, tx?)      : lookup par regionCode (FK target stable)
//   - save(region, tx?)          : INSERT, retourne PersistedRegion (id+date)
//   - update(region, tx?)        : UPDATE complet (état immuable de la PR)
//
// Pas de pagination cursor : volume <200 lignes (cf. Stop pré-codage étape 2,
// memory project_no_cursor_referentials). Le helper infrastructure/db/cursor.ts
// reste réservé aux modules à volume élevé (audit, licences, clients).
//
// Pas de delete : soft-disable via `actif=false` (toggle), cohérent règle L5
// et nature paramétrable du référentiel.
//
// `tx` optionnel : conservé sur la surface du port pour homogénéité avec les
// autres modules (audit, user) où il sert à joindre un audit cross-module dans
// la même transaction (règle L3 PROJECT_CONTEXT). Pour regions et les 5 autres
// référentiels paramétrables, l'audit est désactivé (R-27) → aucun caller ne
// passe de tx en pratique. Le paramètre reste pour si un futur module métier
// devait orchestrer regions+autre dans une tx commune (cas hypothétique).
// ==============================================================================

import type { PersistedRegion, Region } from "../domain/region.entity";

/** Transaction Drizzle Postgres-js (typage opaque pour ne pas coupler le port
 *  à l'API privée Drizzle qui change entre versions). L'adapter cast en interne. */
export type DbTransaction = unknown;

export interface FindAllRegionsOptions {
  /** Si fourni, filtre WHERE actif = ?. Absent = toutes les régions. */
  readonly actif?: boolean;
}

export abstract class RegionRepository {
  /** Liste complète (volume <200 lignes — pas de pagination, cf. ADR 0017
   *  + Stop étape 2). Ordre stable par regionCode ASC. */
  abstract findAll(
    opts?: FindAllRegionsOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedRegion[]>;

  /** Lookup par code business. Retourne null si absent (pas de throw — c'est
   *  au use-case de décider si "absent" = erreur métier). */
  abstract findByCode(regionCode: string, tx?: DbTransaction): Promise<PersistedRegion | null>;

  /** INSERT. Retourne la PersistedRegion avec id + dateCreation BD-générés. */
  abstract save(region: Region, tx?: DbTransaction): Promise<PersistedRegion>;

  /** UPDATE complet (nom, dmResponsable, actif). regionCode immuable (cf.
   *  ADR 0017 — code business stable, FK target). */
  abstract update(region: PersistedRegion, tx?: DbTransaction): Promise<void>;
}
