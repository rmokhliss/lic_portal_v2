// ==============================================================================
// LIC v2 — Entité User (Phase 2.B.bis EC-08)
//
// Domaine pur : aucune dépendance Drizzle, postgres-js, env, logger.
// Importe uniquement TypeScript et module-error.
//
// Coexiste avec l'interface legacy `UserRecord` (ports/user.repository.ts) qui
// reste utilisée par change-password.usecase.ts (F-07/F-08, intouché — Q3).
// `PersistedUser` est la nouvelle surface entité retournée par les méthodes
// EC-08 du repo (findByIdEntity, findAll, findByMatricule, findByEmail, save,
// updateProfile).
//
// Mutations immuables : withProfile() retourne une NOUVELLE instance — le
// repo persiste l'état complet, les use-cases comparent before/after pour
// l'audit (règle L3).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type UserRole = "SADMIN" | "ADMIN" | "USER";

const VALID_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(["SADMIN", "ADMIN", "USER"]);

const MATRICULE_REGEX = /^MAT-\d{3,}$/;
const MATRICULE_MAX_LEN = 20;
const NOM_MAX_LEN = 100;
const PRENOM_MAX_LEN = 100;
const EMAIL_MAX_LEN = 200;
const TEL_MAX_LEN = 20;
// Email "raisonnable" — pas de RFC complet (cf. team-member). Le serveur SMTP
// tranche à l'envoi réel.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateUserInput {
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRole;
  readonly telephone?: string;
}

export interface RehydrateUserProps {
  readonly id: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRole;
  readonly telephone: string | null;
  readonly mustChangePassword: boolean;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface UserProps {
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRole;
  readonly telephone: string | null;
}

/** User non-persisté (pas d'id ni dateCreation). Retourné par User.create. */
export class User {
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRole;
  readonly telephone: string | null;

  protected constructor(props: UserProps) {
    this.matricule = props.matricule;
    this.nom = props.nom;
    this.prenom = props.prenom;
    this.email = props.email;
    this.role = props.role;
    this.telephone = props.telephone;
  }

  static create(input: CreateUserInput): User {
    User.validateMatricule(input.matricule);
    User.validateNom(input.nom);
    User.validatePrenom(input.prenom);
    User.validateEmail(input.email);
    User.validateRole(input.role);
    if (input.telephone !== undefined) {
      User.validateTelephone(input.telephone);
    }
    return new User({
      matricule: input.matricule,
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      role: input.role,
      telephone: input.telephone ?? null,
    });
  }

  static rehydrate(props: RehydrateUserProps): PersistedUser {
    return new PersistedUser(
      {
        matricule: props.matricule,
        nom: props.nom,
        prenom: props.prenom,
        email: props.email,
        role: props.role,
        telephone: props.telephone,
      },
      props.id,
      props.mustChangePassword,
      props.actif,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      matricule: this.matricule,
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      role: this.role,
      telephone: this.telephone,
    };
  }

  // --- Validateurs (statiques, intra-domaine) ------------------------------

  static validateMatricule(matricule: string): void {
    if (typeof matricule !== "string" || matricule.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: "matricule obligatoire (string non vide)",
      });
    }
    if (matricule.length > MATRICULE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `matricule > ${String(MATRICULE_MAX_LEN)} caractères`,
      });
    }
    if (!MATRICULE_REGEX.test(matricule)) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `matricule "${matricule}" doit matcher /^MAT-\\d{3,}$/`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validatePrenom(prenom: string): void {
    if (typeof prenom !== "string" || prenom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: "prenom obligatoire (string non vide)",
      });
    }
    if (prenom.length > PRENOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `prenom > ${String(PRENOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateEmail(email: string): void {
    if (typeof email !== "string" || email.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: "email obligatoire (string non vide)",
      });
    }
    if (email.length > EMAIL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `email > ${String(EMAIL_MAX_LEN)} caractères`,
      });
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `email "${email}" invalide (format attendu : a@b.c)`,
      });
    }
  }

  static validateRole(role: string): void {
    if (!VALID_ROLES.has(role as UserRole)) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `role "${role}" invalide (attendu : SADMIN | ADMIN | USER)`,
      });
    }
  }

  static validateTelephone(telephone: string): void {
    if (telephone === "") {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: "telephone doit être absent ou non-vide (pas une chaîne vide)",
      });
    }
    if (telephone.length > TEL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-722",
        message: `telephone > ${String(TEL_MAX_LEN)} caractères`,
      });
    }
  }
}

/** User persisté (id + actif + dateCreation + mustChangePassword non-optionnels). */
export class PersistedUser extends User {
  readonly id: string;
  readonly mustChangePassword: boolean;
  readonly actif: boolean;
  readonly dateCreation: Date;

  constructor(
    props: UserProps,
    id: string,
    mustChangePassword: boolean,
    actif: boolean,
    dateCreation: Date,
  ) {
    super(props);
    this.id = id;
    this.mustChangePassword = mustChangePassword;
    this.actif = actif;
    this.dateCreation = dateCreation;
  }

  /** Patch immuable : applique nom/prenom/role et retourne une nouvelle
   *  instance. Email + matricule immuables après création (cf. règle EC-08). */
  withProfile(patch: {
    readonly nom?: string;
    readonly prenom?: string;
    readonly role?: UserRole;
  }): PersistedUser {
    if (patch.nom !== undefined) User.validateNom(patch.nom);
    if (patch.prenom !== undefined) User.validatePrenom(patch.prenom);
    if (patch.role !== undefined) User.validateRole(patch.role);
    return new PersistedUser(
      {
        matricule: this.matricule,
        nom: patch.nom ?? this.nom,
        prenom: patch.prenom ?? this.prenom,
        email: this.email,
        role: patch.role ?? this.role,
        telephone: this.telephone,
      },
      this.id,
      this.mustChangePassword,
      this.actif,
      this.dateCreation,
    );
  }

  withActif(actif: boolean): PersistedUser {
    return new PersistedUser(
      {
        matricule: this.matricule,
        nom: this.nom,
        prenom: this.prenom,
        email: this.email,
        role: this.role,
        telephone: this.telephone,
      },
      this.id,
      this.mustChangePassword,
      actif,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return {
      id: this.id,
      ...super.toAuditSnapshot(),
      actif: this.actif,
      mustChangePassword: this.mustChangePassword,
    };
  }

  /** Format d'affichage L9 : "Prénom NOM (MAT-XXX)". Centralisé ici pour
   *  garantir la cohérence (CLAUDE.md règle L9). */
  toDisplay(): string {
    return formatL9({ prenom: this.prenom, nom: this.nom, matricule: this.matricule });
  }
}

/** Helper pure pour formatter à partir d'un sous-ensemble brut (sans entité
 *  complète). Utilisé par les use-cases pour résoudre actorDisplay. */
export function formatL9(input: {
  readonly prenom: string;
  readonly nom: string;
  readonly matricule: string;
}): string {
  return `${input.prenom} ${input.nom} (${input.matricule})`;
}
