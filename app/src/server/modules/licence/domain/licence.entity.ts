// ==============================================================================
// LIC v2 — Entité Licence (Phase 5)
//
// Optimistic locking via `version` (règle L4). Pattern PersistedX comme
// PersistedClient : withProfile / withStatus / withRenouvellement immuables.
//
// Statut workflow :
//   ACTIF (défaut) ↔ SUSPENDU ↔ INACTIF | EXPIRE
// EXPIRE est terminal (pas de retour). Les transitions libres sont validées
// par canTransition (cf. ChangeLicenceStatusUseCase).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type LicenceStatus = "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE";

const VALID_STATUS: ReadonlySet<LicenceStatus> = new Set<LicenceStatus>([
  "ACTIF",
  "INACTIF",
  "SUSPENDU",
  "EXPIRE",
]);

const REFERENCE_REGEX = /^LIC-\d{4}-\d{3,}$/;
const REFERENCE_MAX_LEN = 30;
const COMMENTAIRE_MAX_LEN = 1000;

export interface CreateLicenceDomainInput {
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: Date;
  readonly dateFin: Date;
  readonly status?: LicenceStatus;
  readonly commentaire?: string;
  readonly renouvellementAuto?: boolean;
}

export interface RehydrateLicenceProps {
  readonly id: string;
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: Date;
  readonly dateFin: Date;
  readonly status: LicenceStatus;
  readonly commentaire: string | null;
  readonly version: number;
  readonly renouvellementAuto: boolean;
  readonly notifEnvoyee: boolean;
  readonly dateCreation: Date;
}

interface LicenceProps {
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: Date;
  readonly dateFin: Date;
  readonly status: LicenceStatus;
  readonly commentaire: string | null;
  readonly renouvellementAuto: boolean;
  readonly notifEnvoyee: boolean;
}

export class Licence {
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: Date;
  readonly dateFin: Date;
  readonly status: LicenceStatus;
  readonly commentaire: string | null;
  readonly renouvellementAuto: boolean;
  readonly notifEnvoyee: boolean;

  protected constructor(props: LicenceProps) {
    this.reference = props.reference;
    this.clientId = props.clientId;
    this.entiteId = props.entiteId;
    this.dateDebut = props.dateDebut;
    this.dateFin = props.dateFin;
    this.status = props.status;
    this.commentaire = props.commentaire;
    this.renouvellementAuto = props.renouvellementAuto;
    this.notifEnvoyee = props.notifEnvoyee;
  }

  static create(input: CreateLicenceDomainInput): Licence {
    Licence.validateReference(input.reference);
    Licence.validateDates(input.dateDebut, input.dateFin);
    if (input.status !== undefined) Licence.validateStatus(input.status);
    if (input.commentaire !== undefined) Licence.validateCommentaire(input.commentaire);
    return new Licence({
      reference: input.reference,
      clientId: input.clientId,
      entiteId: input.entiteId,
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      status: input.status ?? "ACTIF",
      commentaire: input.commentaire ?? null,
      renouvellementAuto: input.renouvellementAuto ?? false,
      notifEnvoyee: false,
    });
  }

  static rehydrate(props: RehydrateLicenceProps): PersistedLicence {
    return new PersistedLicence(
      {
        reference: props.reference,
        clientId: props.clientId,
        entiteId: props.entiteId,
        dateDebut: props.dateDebut,
        dateFin: props.dateFin,
        status: props.status,
        commentaire: props.commentaire,
        renouvellementAuto: props.renouvellementAuto,
        notifEnvoyee: props.notifEnvoyee,
      },
      props.id,
      props.version,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      reference: this.reference,
      clientId: this.clientId,
      entiteId: this.entiteId,
      dateDebut: this.dateDebut.toISOString(),
      dateFin: this.dateFin.toISOString(),
      status: this.status,
      renouvellementAuto: this.renouvellementAuto,
    };
  }

  // --- Validateurs ----------------------------------------------------------

  static validateReference(ref: string): void {
    if (typeof ref !== "string" || ref.length === 0) {
      throw new ValidationError({ code: "SPX-LIC-737", message: "reference obligatoire" });
    }
    if (ref.length > REFERENCE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-737",
        message: `reference > ${String(REFERENCE_MAX_LEN)} caractères`,
      });
    }
    if (!REFERENCE_REGEX.test(ref)) {
      throw new ValidationError({
        code: "SPX-LIC-737",
        message: `reference "${ref}" doit matcher /^LIC-\\d{4}-\\d{3,}$/`,
      });
    }
  }

  static validateDates(debut: Date, fin: Date): void {
    if (Number.isNaN(debut.getTime())) {
      throw new ValidationError({ code: "SPX-LIC-737", message: "dateDebut invalide" });
    }
    if (Number.isNaN(fin.getTime())) {
      throw new ValidationError({ code: "SPX-LIC-737", message: "dateFin invalide" });
    }
    if (fin.getTime() <= debut.getTime()) {
      throw new ValidationError({
        code: "SPX-LIC-737",
        message: "dateFin doit être strictement postérieure à dateDebut",
      });
    }
  }

  static validateStatus(status: string): void {
    if (!VALID_STATUS.has(status as LicenceStatus)) {
      throw new ValidationError({
        code: "SPX-LIC-737",
        message: `status "${status}" invalide (ACTIF|INACTIF|SUSPENDU|EXPIRE)`,
      });
    }
  }

  static validateCommentaire(c: string): void {
    if (c.length > COMMENTAIRE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-737",
        message: `commentaire > ${String(COMMENTAIRE_MAX_LEN)} caractères`,
      });
    }
  }

  /** EXPIRE est terminal. Toutes autres transitions libres (sauf vers le
   *  même statut). */
  static canTransition(from: LicenceStatus, to: LicenceStatus): boolean {
    if (from === to) return false;
    if (from === "EXPIRE") return false;
    return VALID_STATUS.has(to);
  }
}

export class PersistedLicence extends Licence {
  readonly id: string;
  readonly version: number;
  readonly dateCreation: Date;

  constructor(props: LicenceProps, id: string, version: number, dateCreation: Date) {
    super(props);
    this.id = id;
    this.version = version;
    this.dateCreation = dateCreation;
  }

  withProfile(patch: {
    readonly dateDebut?: Date;
    readonly dateFin?: Date;
    readonly commentaire?: string | null;
    readonly renouvellementAuto?: boolean;
  }): PersistedLicence {
    const newDebut = patch.dateDebut ?? this.dateDebut;
    const newFin = patch.dateFin ?? this.dateFin;
    if (patch.dateDebut !== undefined || patch.dateFin !== undefined) {
      Licence.validateDates(newDebut, newFin);
    }
    if (patch.commentaire !== undefined && patch.commentaire !== null) {
      Licence.validateCommentaire(patch.commentaire);
    }
    return new PersistedLicence(
      {
        reference: this.reference,
        clientId: this.clientId,
        entiteId: this.entiteId,
        dateDebut: newDebut,
        dateFin: newFin,
        status: this.status,
        commentaire: patch.commentaire === undefined ? this.commentaire : patch.commentaire,
        renouvellementAuto: patch.renouvellementAuto ?? this.renouvellementAuto,
        notifEnvoyee: this.notifEnvoyee,
      },
      this.id,
      this.version,
      this.dateCreation,
    );
  }

  withStatus(newStatus: LicenceStatus): PersistedLicence {
    Licence.validateStatus(newStatus);
    return new PersistedLicence(
      {
        reference: this.reference,
        clientId: this.clientId,
        entiteId: this.entiteId,
        dateDebut: this.dateDebut,
        dateFin: this.dateFin,
        status: newStatus,
        commentaire: this.commentaire,
        renouvellementAuto: this.renouvellementAuto,
        notifEnvoyee: this.notifEnvoyee,
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
