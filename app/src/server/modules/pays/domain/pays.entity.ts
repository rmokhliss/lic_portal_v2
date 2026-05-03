// ==============================================================================
// LIC v2 — Entité Pays (Phase 2.B étape 3/7)
//
// Réplique du pattern Region. Spécificité : champ regionCode (FK → regions)
// optionnel. La validation de l'EXISTENCE de la région se fait au niveau BD
// (FK constraint) — domain valide uniquement le format. Cf. R-29 (à consigner)
// si on découvre un cas où la pré-validation cross-module devient nécessaire.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

// ISO 3166-1 alpha-2 : 2 lettres MAJUSCULE (MA, SN, CI). Pas d'exception
// historique côté LIC v2 — codes ISO purs.
const CODE_PAYS_REGEX = /^[A-Z]{2}$/;
const NOM_MAX_LEN = 100;
// Format aligné avec Region.regionCode (cf. region.entity.ts).
const REGION_CODE_REGEX = /^[A-Z][A-Z0-9_]*$/;
const REGION_CODE_MAX_LEN = 50;

export interface CreatePaysInput {
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode?: string;
  readonly actif?: boolean;
}

export interface RehydratePaysProps {
  readonly id: number;
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode?: string;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface PaysProps {
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode?: string;
  readonly actif: boolean;
}

export class Pays {
  readonly codePays: string;
  readonly nom: string;
  readonly regionCode?: string;
  readonly actif: boolean;

  protected constructor(props: PaysProps) {
    this.codePays = props.codePays;
    this.nom = props.nom;
    this.regionCode = props.regionCode;
    this.actif = props.actif;
  }

  static create(input: CreatePaysInput): Pays {
    Pays.validateCodePays(input.codePays);
    Pays.validateNom(input.nom);
    if (input.regionCode !== undefined) {
      Pays.validateRegionCode(input.regionCode);
    }
    return new Pays({
      codePays: input.codePays,
      nom: input.nom,
      regionCode: input.regionCode,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydratePaysProps): PersistedPays {
    return new PersistedPays(
      {
        codePays: props.codePays,
        nom: props.nom,
        regionCode: props.regionCode,
        actif: props.actif,
      },
      props.id,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      codePays: this.codePays,
      nom: this.nom,
      regionCode: this.regionCode ?? null,
      actif: this.actif,
    };
  }

  // --- Validateurs réutilisables ------------------------------------------

  static validateCodePays(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: "codePays obligatoire (string non vide)",
      });
    }
    if (!CODE_PAYS_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: `codePays "${code}" doit matcher ISO 3166-1 alpha-2 (/^[A-Z]{2}$/)`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateRegionCode(code: string): void {
    if (code === "") {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: "regionCode doit être absent ou non-vide (pas une chaîne vide)",
      });
    }
    if (code.length > REGION_CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: `regionCode > ${String(REGION_CODE_MAX_LEN)} caractères`,
      });
    }
    if (!REGION_CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-705",
        message: `regionCode "${code}" doit matcher /^[A-Z][A-Z0-9_]*$/`,
      });
    }
  }
}

export class PersistedPays extends Pays {
  readonly id: number;
  readonly dateCreation: Date;

  constructor(props: PaysProps, id: number, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  withName(nom: string): PersistedPays {
    Pays.validateNom(nom);
    return new PersistedPays(
      { codePays: this.codePays, nom, regionCode: this.regionCode, actif: this.actif },
      this.id,
      this.dateCreation,
    );
  }

  /** `null`/`undefined` = effacer la valeur (pas de région rattachée). */
  withRegionCode(regionCode: string | null | undefined): PersistedPays {
    if (regionCode !== null && regionCode !== undefined) {
      Pays.validateRegionCode(regionCode);
    }
    return new PersistedPays(
      {
        codePays: this.codePays,
        nom: this.nom,
        regionCode: regionCode ?? undefined,
        actif: this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  toggle(): PersistedPays {
    return new PersistedPays(
      {
        codePays: this.codePays,
        nom: this.nom,
        regionCode: this.regionCode,
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
