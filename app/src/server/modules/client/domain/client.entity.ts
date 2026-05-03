// ==============================================================================
// LIC v2 — Entité Client (Phase 4 étape 4.B — EC-Clients)
//
// Domaine pur : aucune dépendance Drizzle, postgres-js, env, logger.
// Importe uniquement TypeScript et module-error.
//
// Optimistic locking via `version` (règle L4) — le repo vérifie l'égalité de
// la version attendue côté update et bump à chaque write.
//
// Statut métier : PROSPECT / ACTIF / SUSPENDU / RESILIE. RESILIE est terminal
// (pas de transition sortante). Les autres transitions sont libres.
//
// Mutations immuables : withProfile(), withStatus() retournent une NOUVELLE
// instance — le repo persiste l'état complet et l'audit calcule before/after.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type ClientStatut = "PROSPECT" | "ACTIF" | "SUSPENDU" | "RESILIE";

const VALID_STATUTS: ReadonlySet<ClientStatut> = new Set<ClientStatut>([
  "PROSPECT",
  "ACTIF",
  "SUSPENDU",
  "RESILIE",
]);

const CODE_REGEX = /^[A-Z0-9_-]+$/;
const CODE_MAX_LEN = 20;
const RAISON_SOCIALE_MAX_LEN = 200;
const NOM_CONTACT_MAX_LEN = 100;
const EMAIL_CONTACT_MAX_LEN = 200;
const TEL_MAX_LEN = 20;
const SALES_AM_MAX_LEN = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateClientDomainInput {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact?: string;
  readonly emailContact?: string;
  readonly telContact?: string;
  readonly codePays?: string;
  readonly codeDevise?: string;
  readonly codeLangue?: string;
  readonly salesResponsable?: string;
  readonly accountManager?: string;
  readonly statutClient?: ClientStatut;
  readonly dateSignatureContrat?: string;
  readonly dateMiseEnProd?: string;
  readonly dateDemarrageSupport?: string;
  readonly prochaineDateRenouvellementSupport?: string;
}

export interface RehydrateClientProps {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact: string | null;
  readonly emailContact: string | null;
  readonly telContact: string | null;
  readonly codePays: string | null;
  readonly codeDevise: string | null;
  readonly codeLangue: string | null;
  readonly salesResponsable: string | null;
  readonly accountManager: string | null;
  readonly statutClient: ClientStatut;
  readonly dateSignatureContrat: string | null;
  readonly dateMiseEnProd: string | null;
  readonly dateDemarrageSupport: string | null;
  readonly prochaineDateRenouvellementSupport: string | null;
  readonly actif: boolean;
  readonly version: number;
  readonly dateCreation: Date;
}

interface ClientProps {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact: string | null;
  readonly emailContact: string | null;
  readonly telContact: string | null;
  readonly codePays: string | null;
  readonly codeDevise: string | null;
  readonly codeLangue: string | null;
  readonly salesResponsable: string | null;
  readonly accountManager: string | null;
  readonly statutClient: ClientStatut;
  readonly dateSignatureContrat: string | null;
  readonly dateMiseEnProd: string | null;
  readonly dateDemarrageSupport: string | null;
  readonly prochaineDateRenouvellementSupport: string | null;
  readonly actif: boolean;
}

export class Client {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact: string | null;
  readonly emailContact: string | null;
  readonly telContact: string | null;
  readonly codePays: string | null;
  readonly codeDevise: string | null;
  readonly codeLangue: string | null;
  readonly salesResponsable: string | null;
  readonly accountManager: string | null;
  readonly statutClient: ClientStatut;
  readonly dateSignatureContrat: string | null;
  readonly dateMiseEnProd: string | null;
  readonly dateDemarrageSupport: string | null;
  readonly prochaineDateRenouvellementSupport: string | null;
  readonly actif: boolean;

  protected constructor(props: ClientProps) {
    this.codeClient = props.codeClient;
    this.raisonSociale = props.raisonSociale;
    this.nomContact = props.nomContact;
    this.emailContact = props.emailContact;
    this.telContact = props.telContact;
    this.codePays = props.codePays;
    this.codeDevise = props.codeDevise;
    this.codeLangue = props.codeLangue;
    this.salesResponsable = props.salesResponsable;
    this.accountManager = props.accountManager;
    this.statutClient = props.statutClient;
    this.dateSignatureContrat = props.dateSignatureContrat;
    this.dateMiseEnProd = props.dateMiseEnProd;
    this.dateDemarrageSupport = props.dateDemarrageSupport;
    this.prochaineDateRenouvellementSupport = props.prochaineDateRenouvellementSupport;
    this.actif = props.actif;
  }

  static create(input: CreateClientDomainInput): Client {
    Client.validateCodeClient(input.codeClient);
    Client.validateRaisonSociale(input.raisonSociale);
    if (input.emailContact !== undefined && input.emailContact !== "") {
      Client.validateEmail(input.emailContact);
    }
    if (input.statutClient !== undefined) {
      Client.validateStatut(input.statutClient);
    }
    return new Client({
      codeClient: input.codeClient,
      raisonSociale: input.raisonSociale,
      nomContact: input.nomContact ?? null,
      emailContact: input.emailContact ?? null,
      telContact: input.telContact ?? null,
      codePays: input.codePays ?? null,
      codeDevise: input.codeDevise ?? null,
      codeLangue: input.codeLangue ?? null,
      salesResponsable: input.salesResponsable ?? null,
      accountManager: input.accountManager ?? null,
      statutClient: input.statutClient ?? "ACTIF",
      dateSignatureContrat: input.dateSignatureContrat ?? null,
      dateMiseEnProd: input.dateMiseEnProd ?? null,
      dateDemarrageSupport: input.dateDemarrageSupport ?? null,
      prochaineDateRenouvellementSupport: input.prochaineDateRenouvellementSupport ?? null,
      actif: true,
    });
  }

  static rehydrate(props: RehydrateClientProps): PersistedClient {
    return new PersistedClient(
      {
        codeClient: props.codeClient,
        raisonSociale: props.raisonSociale,
        nomContact: props.nomContact,
        emailContact: props.emailContact,
        telContact: props.telContact,
        codePays: props.codePays,
        codeDevise: props.codeDevise,
        codeLangue: props.codeLangue,
        salesResponsable: props.salesResponsable,
        accountManager: props.accountManager,
        statutClient: props.statutClient,
        dateSignatureContrat: props.dateSignatureContrat,
        dateMiseEnProd: props.dateMiseEnProd,
        dateDemarrageSupport: props.dateDemarrageSupport,
        prochaineDateRenouvellementSupport: props.prochaineDateRenouvellementSupport,
        actif: props.actif,
      },
      props.id,
      props.version,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      codeClient: this.codeClient,
      raisonSociale: this.raisonSociale,
      statutClient: this.statutClient,
      codePays: this.codePays,
      codeDevise: this.codeDevise,
      codeLangue: this.codeLangue,
      actif: this.actif,
    };
  }

  // --- Validateurs (statiques) ----------------------------------------------

  static validateCodeClient(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: "codeClient obligatoire",
      });
    }
    if (code.length > CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `codeClient > ${String(CODE_MAX_LEN)} caractères`,
      });
    }
    if (!CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `codeClient "${code}" doit matcher /^[A-Z0-9_-]+$/`,
      });
    }
  }

  static validateRaisonSociale(rs: string): void {
    if (typeof rs !== "string" || rs.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: "raisonSociale obligatoire",
      });
    }
    if (rs.length > RAISON_SOCIALE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `raisonSociale > ${String(RAISON_SOCIALE_MAX_LEN)} caractères`,
      });
    }
  }

  static validateEmail(email: string): void {
    if (email.length > EMAIL_CONTACT_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `email > ${String(EMAIL_CONTACT_MAX_LEN)} caractères`,
      });
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `email "${email}" invalide`,
      });
    }
  }

  static validateStatut(statut: string): void {
    if (!VALID_STATUTS.has(statut as ClientStatut)) {
      throw new ValidationError({
        code: "SPX-LIC-726",
        message: `statut "${statut}" invalide (PROSPECT|ACTIF|SUSPENDU|RESILIE)`,
      });
    }
  }

  /** RESILIE est terminal (pas de transition sortante). Toutes les autres
   *  transitions sont autorisées (libre passage entre PROSPECT/ACTIF/SUSPENDU). */
  static canTransition(from: ClientStatut, to: ClientStatut): boolean {
    if (from === to) return false;
    if (from === "RESILIE") return false;
    return VALID_STATUTS.has(to);
  }

  // Accesseurs des constantes de validation pour lint-friendly usage externe.
  static get TEL_MAX_LEN_(): number {
    return TEL_MAX_LEN;
  }
  static get NOM_CONTACT_MAX_LEN_(): number {
    return NOM_CONTACT_MAX_LEN;
  }
  static get SALES_AM_MAX_LEN_(): number {
    return SALES_AM_MAX_LEN;
  }
}

export class PersistedClient extends Client {
  readonly id: string;
  readonly version: number;
  readonly dateCreation: Date;

  constructor(props: ClientProps, id: string, version: number, dateCreation: Date) {
    super(props);
    this.id = id;
    this.version = version;
    this.dateCreation = dateCreation;
  }

  /** Patch partiel sur les champs profil (hors statut, hors codeClient).
   *  Retourne une nouvelle instance avec version inchangée — le repo bumpera
   *  la version au write. */
  withProfile(patch: {
    readonly raisonSociale?: string;
    readonly nomContact?: string | null;
    readonly emailContact?: string | null;
    readonly telContact?: string | null;
    readonly codePays?: string | null;
    readonly codeDevise?: string | null;
    readonly codeLangue?: string | null;
    readonly salesResponsable?: string | null;
    readonly accountManager?: string | null;
    readonly dateSignatureContrat?: string | null;
    readonly dateMiseEnProd?: string | null;
    readonly dateDemarrageSupport?: string | null;
    readonly prochaineDateRenouvellementSupport?: string | null;
  }): PersistedClient {
    if (patch.raisonSociale !== undefined) {
      Client.validateRaisonSociale(patch.raisonSociale);
    }
    if (
      patch.emailContact !== undefined &&
      patch.emailContact !== null &&
      patch.emailContact !== ""
    ) {
      Client.validateEmail(patch.emailContact);
    }
    return new PersistedClient(
      {
        codeClient: this.codeClient,
        raisonSociale: patch.raisonSociale ?? this.raisonSociale,
        nomContact: patch.nomContact === undefined ? this.nomContact : patch.nomContact,
        emailContact: patch.emailContact === undefined ? this.emailContact : patch.emailContact,
        telContact: patch.telContact === undefined ? this.telContact : patch.telContact,
        codePays: patch.codePays === undefined ? this.codePays : patch.codePays,
        codeDevise: patch.codeDevise === undefined ? this.codeDevise : patch.codeDevise,
        codeLangue: patch.codeLangue === undefined ? this.codeLangue : patch.codeLangue,
        salesResponsable:
          patch.salesResponsable === undefined ? this.salesResponsable : patch.salesResponsable,
        accountManager:
          patch.accountManager === undefined ? this.accountManager : patch.accountManager,
        statutClient: this.statutClient,
        dateSignatureContrat:
          patch.dateSignatureContrat === undefined
            ? this.dateSignatureContrat
            : patch.dateSignatureContrat,
        dateMiseEnProd:
          patch.dateMiseEnProd === undefined ? this.dateMiseEnProd : patch.dateMiseEnProd,
        dateDemarrageSupport:
          patch.dateDemarrageSupport === undefined
            ? this.dateDemarrageSupport
            : patch.dateDemarrageSupport,
        prochaineDateRenouvellementSupport:
          patch.prochaineDateRenouvellementSupport === undefined
            ? this.prochaineDateRenouvellementSupport
            : patch.prochaineDateRenouvellementSupport,
        actif: this.actif,
      },
      this.id,
      this.version,
      this.dateCreation,
    );
  }

  withStatus(newStatus: ClientStatut): PersistedClient {
    Client.validateStatut(newStatus);
    return new PersistedClient(
      {
        codeClient: this.codeClient,
        raisonSociale: this.raisonSociale,
        nomContact: this.nomContact,
        emailContact: this.emailContact,
        telContact: this.telContact,
        codePays: this.codePays,
        codeDevise: this.codeDevise,
        codeLangue: this.codeLangue,
        salesResponsable: this.salesResponsable,
        accountManager: this.accountManager,
        statutClient: newStatus,
        dateSignatureContrat: this.dateSignatureContrat,
        dateMiseEnProd: this.dateMiseEnProd,
        dateDemarrageSupport: this.dateDemarrageSupport,
        prochaineDateRenouvellementSupport: this.prochaineDateRenouvellementSupport,
        actif: this.actif,
      },
      this.id,
      this.version,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, version: this.version, ...super.toAuditSnapshot() };
  }
}
