// ==============================================================================
// LIC v2 — Entité Produit (Phase 6 étape 6.B)
//
// Référentiel paramétrable SADMIN. Pattern strict aligné sur Region
// (Phase 2.B étape 2/7). PK serial business stable (ADR 0017), pas d'audit
// (R-27).
//
// Factories :
//   - create(input)    : valide invariants → throw SPX-LIC-745
//   - rehydrate(props) : reconstruit depuis BD, pas de re-validation
//
// Mutations immuables : withName(), withDescription(), toggle().
// Le code reste immuable une fois posé (FK target).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const CODE_REGEX = /^[A-Z][A-Z0-9_-]*$/;
const CODE_MAX_LEN = 30;
const NOM_MAX_LEN = 200;
const DESC_MAX_LEN = 1000;

export interface CreateProduitInput {
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly actif?: boolean;
}

export interface RehydrateProduitProps {
  readonly id: number;
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly actif: boolean;
}

interface ProduitProps {
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly actif: boolean;
}

export class Produit {
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly actif: boolean;

  protected constructor(props: ProduitProps) {
    this.code = props.code;
    this.nom = props.nom;
    this.description = props.description;
    this.actif = props.actif;
  }

  static create(input: CreateProduitInput): Produit {
    Produit.validateCode(input.code);
    Produit.validateNom(input.nom);
    if (input.description !== undefined) Produit.validateDescription(input.description);
    return new Produit({
      code: input.code,
      nom: input.nom,
      description: input.description,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateProduitProps): PersistedProduit {
    return new PersistedProduit(
      {
        code: props.code,
        nom: props.nom,
        description: props.description,
        actif: props.actif,
      },
      props.id,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      code: this.code,
      nom: this.nom,
      description: this.description ?? null,
      actif: this.actif,
    };
  }

  static validateCode(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: "code produit obligatoire (string non vide)",
      });
    }
    if (code.length > CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: `code produit > ${String(CODE_MAX_LEN)} caractères`,
      });
    }
    if (!CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: `code produit "${code}" doit matcher /^[A-Z][A-Z0-9_-]*$/`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({ code: "SPX-LIC-745", message: "nom obligatoire (non vide)" });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateDescription(desc: string): void {
    if (desc === "") {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: "description doit être absente ou non-vide",
      });
    }
    if (desc.length > DESC_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-745",
        message: `description > ${String(DESC_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedProduit extends Produit {
  readonly id: number;

  constructor(props: ProduitProps, id: number) {
    super(props);
    this.id = id;
  }

  withName(nom: string): PersistedProduit {
    Produit.validateNom(nom);
    return new PersistedProduit(
      { code: this.code, nom, description: this.description, actif: this.actif },
      this.id,
    );
  }

  withDescription(description: string | null | undefined): PersistedProduit {
    if (description !== null && description !== undefined) Produit.validateDescription(description);
    return new PersistedProduit(
      {
        code: this.code,
        nom: this.nom,
        description: description ?? undefined,
        actif: this.actif,
      },
      this.id,
    );
  }

  toggle(): PersistedProduit {
    return new PersistedProduit(
      { code: this.code, nom: this.nom, description: this.description, actif: !this.actif },
      this.id,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
