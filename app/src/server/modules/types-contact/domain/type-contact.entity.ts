// ==============================================================================
// LIC v2 — Entité TypeContact (Phase 2.B étape 3/7)
//
// Réplique du pattern Region. Spécificités :
//   - code (pas codeContact ni codeType) : varchar(30) MAJUSCULE_UNDERSCORE
//   - libelle (PAS nom) — alignement strict data-model.md (lic_types_contact_ref)
//   - PAS de dateCreation (cf. data-model.md)
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const CODE_REGEX = /^[A-Z][A-Z0-9_]*$/;
const CODE_MAX_LEN = 30;
const LIBELLE_MAX_LEN = 100;

export interface CreateTypeContactInput {
  readonly code: string;
  readonly libelle: string;
  readonly actif?: boolean;
}

export interface RehydrateTypeContactProps {
  readonly id: number;
  readonly code: string;
  readonly libelle: string;
  readonly actif: boolean;
}

interface TypeContactProps {
  readonly code: string;
  readonly libelle: string;
  readonly actif: boolean;
}

export class TypeContact {
  readonly code: string;
  readonly libelle: string;
  readonly actif: boolean;

  protected constructor(props: TypeContactProps) {
    this.code = props.code;
    this.libelle = props.libelle;
    this.actif = props.actif;
  }

  static create(input: CreateTypeContactInput): TypeContact {
    TypeContact.validateCode(input.code);
    TypeContact.validateLibelle(input.libelle);
    return new TypeContact({
      code: input.code,
      libelle: input.libelle,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateTypeContactProps): PersistedTypeContact {
    return new PersistedTypeContact(
      { code: props.code, libelle: props.libelle, actif: props.actif },
      props.id,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      code: this.code,
      libelle: this.libelle,
      actif: this.actif,
    };
  }

  static validateCode(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-714",
        message: "code obligatoire (string non vide)",
      });
    }
    if (code.length > CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-714",
        message: `code > ${String(CODE_MAX_LEN)} caractères`,
      });
    }
    if (!CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-714",
        message: `code "${code}" doit matcher /^[A-Z][A-Z0-9_]*$/`,
      });
    }
  }

  static validateLibelle(libelle: string): void {
    if (typeof libelle !== "string" || libelle.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-714",
        message: "libelle obligatoire (string non vide)",
      });
    }
    if (libelle.length > LIBELLE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-714",
        message: `libelle > ${String(LIBELLE_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedTypeContact extends TypeContact {
  readonly id: number;

  constructor(props: TypeContactProps, id: number) {
    super(props);
    this.id = id;
  }

  withLibelle(libelle: string): PersistedTypeContact {
    TypeContact.validateLibelle(libelle);
    return new PersistedTypeContact({ code: this.code, libelle, actif: this.actif }, this.id);
  }

  toggle(): PersistedTypeContact {
    return new PersistedTypeContact(
      { code: this.code, libelle: this.libelle, actif: !this.actif },
      this.id,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
