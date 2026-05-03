// ==============================================================================
// LIC v2 — Entité Langue (Phase 2.B étape 3/7)
//
// Réplique du pattern Region simplifié. Spécificités :
//   - codeLangue : code ISO court MINUSCULE (fr, en, ar, es) — /^[a-z]{2,5}$/
//   - Aucun champ optionnel (pas de symbole, pas de DM, pas de FK)
//   - PAS de dateCreation (cf. data-model.md)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const CODE_LANGUE_REGEX = /^[a-z]{2,5}$/;
const NOM_MAX_LEN = 100;

export interface CreateLangueInput {
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif?: boolean;
}

export interface RehydrateLangueProps {
  readonly id: number;
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif: boolean;
}

interface LangueProps {
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif: boolean;
}

export class Langue {
  readonly codeLangue: string;
  readonly nom: string;
  readonly actif: boolean;

  protected constructor(props: LangueProps) {
    this.codeLangue = props.codeLangue;
    this.nom = props.nom;
    this.actif = props.actif;
  }

  static create(input: CreateLangueInput): Langue {
    Langue.validateCodeLangue(input.codeLangue);
    Langue.validateNom(input.nom);
    return new Langue({
      codeLangue: input.codeLangue,
      nom: input.nom,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateLangueProps): PersistedLangue {
    return new PersistedLangue(
      { codeLangue: props.codeLangue, nom: props.nom, actif: props.actif },
      props.id,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      codeLangue: this.codeLangue,
      nom: this.nom,
      actif: this.actif,
    };
  }

  static validateCodeLangue(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-711",
        message: "codeLangue obligatoire (string non vide)",
      });
    }
    if (!CODE_LANGUE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-711",
        message: `codeLangue "${code}" doit matcher /^[a-z]{2,5}$/ (ISO 639 court)`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-711",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-711",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedLangue extends Langue {
  readonly id: number;

  constructor(props: LangueProps, id: number) {
    super(props);
    this.id = id;
  }

  withName(nom: string): PersistedLangue {
    Langue.validateNom(nom);
    return new PersistedLangue({ codeLangue: this.codeLangue, nom, actif: this.actif }, this.id);
  }

  toggle(): PersistedLangue {
    return new PersistedLangue(
      { codeLangue: this.codeLangue, nom: this.nom, actif: !this.actif },
      this.id,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
