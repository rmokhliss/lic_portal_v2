// ==============================================================================
// LIC v2 — Entité Devise (Phase 2.B étape 3/7)
//
// Réplique du pattern Region. Spécificités :
//   - codeDevise : ISO 4217 (3 lettres majuscule) ou variantes legacy LIC
//     (XOF, XAF, MAD…) → /^[A-Z]{3,10}$/
//   - symbole optionnel (DH, €, $, F CFA, FCFA…)
//   - PAS de dateCreation (cf. data-model.md — la table n'a pas cette colonne)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const CODE_DEVISE_REGEX = /^[A-Z]{3,10}$/;
const NOM_MAX_LEN = 100;
const SYMBOLE_MAX_LEN = 10;

export interface CreateDeviseInput {
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole?: string;
  readonly actif?: boolean;
}

export interface RehydrateDeviseProps {
  readonly id: number;
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole?: string;
  readonly actif: boolean;
}

interface DeviseProps {
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole?: string;
  readonly actif: boolean;
}

export class Devise {
  readonly codeDevise: string;
  readonly nom: string;
  readonly symbole?: string;
  readonly actif: boolean;

  protected constructor(props: DeviseProps) {
    this.codeDevise = props.codeDevise;
    this.nom = props.nom;
    this.symbole = props.symbole;
    this.actif = props.actif;
  }

  static create(input: CreateDeviseInput): Devise {
    Devise.validateCodeDevise(input.codeDevise);
    Devise.validateNom(input.nom);
    if (input.symbole !== undefined) {
      Devise.validateSymbole(input.symbole);
    }
    return new Devise({
      codeDevise: input.codeDevise,
      nom: input.nom,
      symbole: input.symbole,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateDeviseProps): PersistedDevise {
    return new PersistedDevise(
      {
        codeDevise: props.codeDevise,
        nom: props.nom,
        symbole: props.symbole,
        actif: props.actif,
      },
      props.id,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      codeDevise: this.codeDevise,
      nom: this.nom,
      symbole: this.symbole ?? null,
      actif: this.actif,
    };
  }

  static validateCodeDevise(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: "codeDevise obligatoire (string non vide)",
      });
    }
    if (!CODE_DEVISE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: `codeDevise "${code}" doit matcher /^[A-Z]{3,10}$/ (ISO 4217 + variants)`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateSymbole(symbole: string): void {
    if (symbole === "") {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: "symbole doit être absent ou non-vide (pas une chaîne vide)",
      });
    }
    if (symbole.length > SYMBOLE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-708",
        message: `symbole > ${String(SYMBOLE_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedDevise extends Devise {
  readonly id: number;

  constructor(props: DeviseProps, id: number) {
    super(props);
    this.id = id;
  }

  withName(nom: string): PersistedDevise {
    Devise.validateNom(nom);
    return new PersistedDevise(
      { codeDevise: this.codeDevise, nom, symbole: this.symbole, actif: this.actif },
      this.id,
    );
  }

  withSymbole(symbole: string | null | undefined): PersistedDevise {
    if (symbole !== null && symbole !== undefined) {
      Devise.validateSymbole(symbole);
    }
    return new PersistedDevise(
      {
        codeDevise: this.codeDevise,
        nom: this.nom,
        symbole: symbole ?? undefined,
        actif: this.actif,
      },
      this.id,
    );
  }

  toggle(): PersistedDevise {
    return new PersistedDevise(
      {
        codeDevise: this.codeDevise,
        nom: this.nom,
        symbole: this.symbole,
        actif: !this.actif,
      },
      this.id,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
