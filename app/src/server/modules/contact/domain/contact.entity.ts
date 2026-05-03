// ==============================================================================
// LIC v2 — Entité Contact (Phase 4 étape 4.C — EC-Clients)
//
// Multi-type via FK type_contact_code → lic_types_contact_ref.code (Phase 2.B).
// Pas de UNIQUE (entite_id, type) — un contact peut avoir plusieurs entries
// du même type pour une entité (cas plusieurs sites).
//
// Hard delete (pas de soft delete actif) — la traçabilité est dans l'audit.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const NOM_MAX_LEN = 100;
const PRENOM_MAX_LEN = 100;
const EMAIL_MAX_LEN = 200;
const TEL_MAX_LEN = 20;
const TYPE_CODE_MAX_LEN = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateContactDomainInput {
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
}

export interface RehydrateContactProps {
  readonly id: string;
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface ContactProps {
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;
}

export class Contact {
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;

  protected constructor(props: ContactProps) {
    this.entiteId = props.entiteId;
    this.typeContactCode = props.typeContactCode;
    this.nom = props.nom;
    this.prenom = props.prenom;
    this.email = props.email;
    this.telephone = props.telephone;
    this.actif = props.actif;
  }

  static create(input: CreateContactDomainInput): Contact {
    Contact.validateTypeCode(input.typeContactCode);
    Contact.validateNom(input.nom);
    if (input.email !== undefined && input.email !== "") {
      Contact.validateEmail(input.email);
    }
    return new Contact({
      entiteId: input.entiteId,
      typeContactCode: input.typeContactCode,
      nom: input.nom,
      prenom: input.prenom ?? null,
      email: input.email ?? null,
      telephone: input.telephone ?? null,
      actif: true,
    });
  }

  static rehydrate(props: RehydrateContactProps): PersistedContact {
    return new PersistedContact(
      {
        entiteId: props.entiteId,
        typeContactCode: props.typeContactCode,
        nom: props.nom,
        prenom: props.prenom,
        email: props.email,
        telephone: props.telephone,
        actif: props.actif,
      },
      props.id,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      entiteId: this.entiteId,
      typeContactCode: this.typeContactCode,
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      telephone: this.telephone,
      actif: this.actif,
    };
  }

  static validateTypeCode(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: "typeContactCode obligatoire",
      });
    }
    if (code.length > TYPE_CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `typeContactCode > ${String(TYPE_CODE_MAX_LEN)} caractères`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: "nom obligatoire",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateEmail(email: string): void {
    if (email.length > EMAIL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `email > ${String(EMAIL_MAX_LEN)} caractères`,
      });
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `email "${email}" invalide`,
      });
    }
  }

  static validatePrenom(prenom: string): void {
    if (prenom.length > PRENOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `prenom > ${String(PRENOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateTelephone(tel: string): void {
    if (tel.length > TEL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-734",
        message: `telephone > ${String(TEL_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedContact extends Contact {
  readonly id: string;
  readonly dateCreation: Date;

  constructor(props: ContactProps, id: string, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  withProfile(patch: {
    readonly typeContactCode?: string;
    readonly nom?: string;
    readonly prenom?: string | null;
    readonly email?: string | null;
    readonly telephone?: string | null;
  }): PersistedContact {
    if (patch.typeContactCode !== undefined) Contact.validateTypeCode(patch.typeContactCode);
    if (patch.nom !== undefined) Contact.validateNom(patch.nom);
    if (patch.email !== undefined && patch.email !== null && patch.email !== "") {
      Contact.validateEmail(patch.email);
    }
    if (patch.prenom !== undefined && patch.prenom !== null) {
      Contact.validatePrenom(patch.prenom);
    }
    if (patch.telephone !== undefined && patch.telephone !== null) {
      Contact.validateTelephone(patch.telephone);
    }
    return new PersistedContact(
      {
        entiteId: this.entiteId,
        typeContactCode: patch.typeContactCode ?? this.typeContactCode,
        nom: patch.nom ?? this.nom,
        prenom: patch.prenom === undefined ? this.prenom : patch.prenom,
        email: patch.email === undefined ? this.email : patch.email,
        telephone: patch.telephone === undefined ? this.telephone : patch.telephone,
        actif: this.actif,
      },
      this.id,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
