// ==============================================================================
// LIC v2 — Entité TeamMember (Phase 2.B étape 4/7)
//
// Spécificités vs les 5 référentiels précédents :
//   - PAS de code business stable (pas de region_code/code_pays/code_devise…).
//     L'identifiant interne BD (id serial) est le seul handle. Le port expose
//     donc findById(id: number), pas findByCode.
//   - Champs identitaires : nom (required), prenom/email/telephone (optionals)
//   - roleTeam : 'SALES' | 'AM' | 'DM' (CHECK BD aligné).
//   - regionCode optionnel — convention métier "renseigné pour les DM"
//     (data-model.md), pas d'invariant stricte au niveau domain.
//
// Pas de duplicate-check : data-model.md n'impose aucune UNIQUE constraint
// hors PK serial. Si un futur lot exige unicité (email actif, par ex.),
// SPX-LIC-716 (ConflictError) reste réservé.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type RoleTeam = "SALES" | "AM" | "DM";
const VALID_ROLES: ReadonlySet<RoleTeam> = new Set<RoleTeam>(["SALES", "AM", "DM"]);

const NOM_MAX_LEN = 100;
const PRENOM_MAX_LEN = 100;
const EMAIL_MAX_LEN = 200;
const TEL_MAX_LEN = 20;
const REGION_CODE_REGEX = /^[A-Z][A-Z0-9_]*$/;
const REGION_CODE_MAX_LEN = 50;
// Email "raisonnable" : pas de RFC complet — on rejette les formats clairement
// invalides (espace, pas de @, pas de domaine). Le navigateur + serveur SMTP
// font la vraie validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateTeamMemberInput {
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
  readonly roleTeam: RoleTeam;
  readonly regionCode?: string;
  readonly actif?: boolean;
}

export interface RehydrateTeamMemberProps {
  readonly id: number;
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
  readonly roleTeam: RoleTeam;
  readonly regionCode?: string;
  readonly actif: boolean;
  readonly dateCreation: Date;
}

interface TeamMemberProps {
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
  readonly roleTeam: RoleTeam;
  readonly regionCode?: string;
  readonly actif: boolean;
}

export class TeamMember {
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
  readonly roleTeam: RoleTeam;
  readonly regionCode?: string;
  readonly actif: boolean;

  protected constructor(props: TeamMemberProps) {
    this.nom = props.nom;
    this.prenom = props.prenom;
    this.email = props.email;
    this.telephone = props.telephone;
    this.roleTeam = props.roleTeam;
    this.regionCode = props.regionCode;
    this.actif = props.actif;
  }

  static create(input: CreateTeamMemberInput): TeamMember {
    TeamMember.validateNom(input.nom);
    TeamMember.validateRoleTeam(input.roleTeam);
    if (input.prenom !== undefined) TeamMember.validatePrenom(input.prenom);
    if (input.email !== undefined) TeamMember.validateEmail(input.email);
    if (input.telephone !== undefined) TeamMember.validateTelephone(input.telephone);
    if (input.regionCode !== undefined) TeamMember.validateRegionCode(input.regionCode);

    return new TeamMember({
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      telephone: input.telephone,
      roleTeam: input.roleTeam,
      regionCode: input.regionCode,
      actif: input.actif ?? true,
    });
  }

  static rehydrate(props: RehydrateTeamMemberProps): PersistedTeamMember {
    return new PersistedTeamMember(
      {
        nom: props.nom,
        prenom: props.prenom,
        email: props.email,
        telephone: props.telephone,
        roleTeam: props.roleTeam,
        regionCode: props.regionCode,
        actif: props.actif,
      },
      props.id,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      nom: this.nom,
      prenom: this.prenom ?? null,
      email: this.email ?? null,
      telephone: this.telephone ?? null,
      roleTeam: this.roleTeam,
      regionCode: this.regionCode ?? null,
      actif: this.actif,
    };
  }

  // --- Validateurs réutilisables ------------------------------------------

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: "nom obligatoire (string non vide)",
      });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validatePrenom(prenom: string): void {
    if (prenom === "") {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: "prenom doit être absent ou non-vide",
      });
    }
    if (prenom.length > PRENOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `prenom > ${String(PRENOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateEmail(email: string): void {
    if (email === "") {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: "email doit être absent ou non-vide",
      });
    }
    if (email.length > EMAIL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `email > ${String(EMAIL_MAX_LEN)} caractères`,
      });
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `email "${email}" invalide`,
      });
    }
  }

  static validateTelephone(telephone: string): void {
    if (telephone === "") {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: "telephone doit être absent ou non-vide",
      });
    }
    if (telephone.length > TEL_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `telephone > ${String(TEL_MAX_LEN)} caractères`,
      });
    }
  }

  static validateRoleTeam(role: string): asserts role is RoleTeam {
    if (!VALID_ROLES.has(role as RoleTeam)) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `roleTeam invalide : "${role}" — attendu SALES, AM ou DM`,
      });
    }
  }

  static validateRegionCode(code: string): void {
    if (code === "") {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: "regionCode doit être absent ou non-vide",
      });
    }
    if (code.length > REGION_CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `regionCode > ${String(REGION_CODE_MAX_LEN)} caractères`,
      });
    }
    if (!REGION_CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-717",
        message: `regionCode "${code}" doit matcher /^[A-Z][A-Z0-9_]*$/`,
      });
    }
  }
}

export class PersistedTeamMember extends TeamMember {
  readonly id: number;
  readonly dateCreation: Date;

  constructor(props: TeamMemberProps, id: number, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  /** Patch immuable. Pour chaque champ : `undefined` = inchangé,
   *  `null` (sur les optionnels) = effacer, `string`/value = remplacer. */
  withPatch(patch: {
    readonly nom?: string;
    readonly prenom?: string | null;
    readonly email?: string | null;
    readonly telephone?: string | null;
    readonly roleTeam?: RoleTeam;
    readonly regionCode?: string | null;
  }): PersistedTeamMember {
    const next: TeamMemberProps = {
      nom: patch.nom ?? this.nom,
      prenom: "prenom" in patch ? (patch.prenom ?? undefined) : this.prenom,
      email: "email" in patch ? (patch.email ?? undefined) : this.email,
      telephone: "telephone" in patch ? (patch.telephone ?? undefined) : this.telephone,
      roleTeam: patch.roleTeam ?? this.roleTeam,
      regionCode: "regionCode" in patch ? (patch.regionCode ?? undefined) : this.regionCode,
      actif: this.actif,
    };
    if (patch.nom !== undefined) TeamMember.validateNom(next.nom);
    if (patch.roleTeam !== undefined) TeamMember.validateRoleTeam(next.roleTeam);
    if (next.prenom !== undefined && "prenom" in patch) TeamMember.validatePrenom(next.prenom);
    if (next.email !== undefined && "email" in patch) TeamMember.validateEmail(next.email);
    if (next.telephone !== undefined && "telephone" in patch) {
      TeamMember.validateTelephone(next.telephone);
    }
    if (next.regionCode !== undefined && "regionCode" in patch) {
      TeamMember.validateRegionCode(next.regionCode);
    }
    return new PersistedTeamMember(next, this.id, this.dateCreation);
  }

  toggle(): PersistedTeamMember {
    return new PersistedTeamMember(
      {
        nom: this.nom,
        prenom: this.prenom,
        email: this.email,
        telephone: this.telephone,
        roleTeam: this.roleTeam,
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
