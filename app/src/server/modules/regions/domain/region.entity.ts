// ==============================================================================
// LIC v2 — Entité Region (Phase 2.B étape 2/7)
//
// Domaine pur : aucune dépendance Drizzle, postgres-js, env, logger. Importe
// uniquement TypeScript et module-error.
//
// Deux factories publiques :
//   - create(input)    : validation complète des invariants → throw SPX-LIC-702
//   - rehydrate(props) : reconstruction depuis BD, pas de validation (BD
//                        = source de vérité)
//
// Mutations immuables : withName(), withDmResponsable(), toggle() retournent
// une NOUVELLE instance. Le repo persiste l'état complet — pas de "patch
// partiel" qui complique le diff d'audit.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

// regionCode : identifiant business stable (ADR 0017). Format codes constants
// MAJUSCULE_AVEC_UNDERSCORES (ex: NORD_AFRIQUE, AFRIQUE_OUEST). Validé strict
// pour éviter les collisions avec des libellés (espaces, accents, casse).
const REGION_CODE_REGEX = /^[A-Z][A-Z0-9_]*$/;
const REGION_CODE_MAX_LEN = 50;
const NOM_MAX_LEN = 100;
const DM_MAX_LEN = 100;

export interface CreateRegionInput {
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable?: string;
  /** Default true (création active). Présent pour permettre le seed/import
   *  d'une région inactive sans toggle séparé. */
  readonly actif?: boolean;
}

export interface RehydrateRegionProps {
  readonly id: number;
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable?: string;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface RegionProps {
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable?: string;
  readonly actif: boolean;
}

/** État courant d'une région avant persistance. Pas d'id ni dateCreation
 *  (générés par BD). */
export class Region {
  readonly regionCode: string;
  readonly nom: string;
  readonly dmResponsable?: string;
  readonly actif: boolean;

  protected constructor(props: RegionProps) {
    this.regionCode = props.regionCode;
    this.nom = props.nom;
    this.dmResponsable = props.dmResponsable;
    this.actif = props.actif;
  }

  /** Factory standard. Throw ValidationError SPX-LIC-702 sur invariant violé. */
  static create(input: CreateRegionInput): Region {
    Region.validateRegionCode(input.regionCode);
    Region.validateNom(input.nom);
    if (input.dmResponsable !== undefined) {
      Region.validateDmResponsable(input.dmResponsable);
    }
    return new Region({
      regionCode: input.regionCode,
      nom: input.nom,
      dmResponsable: input.dmResponsable,
      actif: input.actif ?? true,
    });
  }

  /** Factory de rehydratation depuis BD (lecture). Pas de re-validation : la BD
   *  est source de vérité. Retourne PersistedRegion (avec id + dateCreation). */
  static rehydrate(props: RehydrateRegionProps): PersistedRegion {
    return new PersistedRegion(
      {
        regionCode: props.regionCode,
        nom: props.nom,
        dmResponsable: props.dmResponsable,
        actif: props.actif,
      },
      props.id,
      props.dateCreation,
    );
  }

  /** Snapshot JSON-sérialisable pour audit (before/after). PersistedRegion
   *  ajoute id en surcharge. */
  toAuditSnapshot(): Record<string, unknown> {
    return {
      regionCode: this.regionCode,
      nom: this.nom,
      dmResponsable: this.dmResponsable ?? null,
      actif: this.actif,
    };
  }

  // --- Validateurs réutilisables (statiques, intra-domaine) ----------------

  static validateRegionCode(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: "regionCode obligatoire (string non vide)",
      });
    }
    if (code.length > REGION_CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: `regionCode > ${String(REGION_CODE_MAX_LEN)} caractères`,
      });
    }
    if (!REGION_CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: `regionCode "${code}" doit matcher /^[A-Z][A-Z0-9_]*$/`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateDmResponsable(dm: string): void {
    if (dm === "") {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: "dmResponsable doit être absent ou non-vide (pas une chaîne vide)",
      });
    }
    if (dm.length > DM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-702",
        message: `dmResponsable > ${String(DM_MAX_LEN)} caractères`,
      });
    }
  }
}

/** Variante de Region avec id + dateCreation non-optionnels. Retournée par
 *  RegionRepository.findAll/findByCode/save/update (entités persistées). */
export class PersistedRegion extends Region {
  readonly id: number;
  readonly dateCreation: Date;

  constructor(props: RegionProps, id: number, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  /** Renomme la région (immutable). Ne touche pas regionCode (FK target stable
   *  ADR 0017 — les codes business ne changent pas une fois posés). */
  withName(nom: string): PersistedRegion {
    Region.validateNom(nom);
    return new PersistedRegion(
      {
        regionCode: this.regionCode,
        nom,
        dmResponsable: this.dmResponsable,
        actif: this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  /** Met à jour le DM. `null` ou `undefined` = effacer la valeur. */
  withDmResponsable(dm: string | null | undefined): PersistedRegion {
    if (dm !== null && dm !== undefined) {
      Region.validateDmResponsable(dm);
    }
    return new PersistedRegion(
      {
        regionCode: this.regionCode,
        nom: this.nom,
        dmResponsable: dm ?? undefined,
        actif: this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  /** Bascule actif ↔ inactif (immutable). Pas de delete BD — soft-disable
   *  via `actif=false` (cohérent règle L5 et nature paramétrable du référentiel). */
  toggle(): PersistedRegion {
    return new PersistedRegion(
      {
        regionCode: this.regionCode,
        nom: this.nom,
        dmResponsable: this.dmResponsable,
        actif: !this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
