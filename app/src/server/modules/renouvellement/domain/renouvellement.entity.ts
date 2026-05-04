// ==============================================================================
// LIC v2 — Entité Renouvellement (Phase 5)
// Statut workflow : EN_COURS → VALIDE | ANNULE | CREE (auto-renouv jobs Phase 9).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export type RenewStatus = "EN_COURS" | "VALIDE" | "CREE" | "ANNULE";

const VALID_STATUS: ReadonlySet<RenewStatus> = new Set<RenewStatus>([
  "EN_COURS",
  "VALIDE",
  "CREE",
  "ANNULE",
]);

const COMMENTAIRE_MAX_LEN = 1000;

export interface CreateRenouvellementDomainInput {
  readonly licenceId: string;
  readonly nouvelleDateDebut: Date;
  readonly nouvelleDateFin: Date;
  readonly commentaire?: string;
}

export interface RehydrateRenouvellementProps {
  readonly id: string;
  readonly licenceId: string;
  readonly nouvelleDateDebut: Date;
  readonly nouvelleDateFin: Date;
  readonly status: RenewStatus;
  readonly commentaire: string | null;
  readonly valideePar: string | null;
  readonly dateValidation: Date | null;
  readonly dateCreation: Date;
}

interface RenouvellementProps {
  readonly licenceId: string;
  readonly nouvelleDateDebut: Date;
  readonly nouvelleDateFin: Date;
  readonly status: RenewStatus;
  readonly commentaire: string | null;
  readonly valideePar: string | null;
  readonly dateValidation: Date | null;
}

export class Renouvellement {
  readonly licenceId: string;
  readonly nouvelleDateDebut: Date;
  readonly nouvelleDateFin: Date;
  readonly status: RenewStatus;
  readonly commentaire: string | null;
  readonly valideePar: string | null;
  readonly dateValidation: Date | null;

  protected constructor(props: RenouvellementProps) {
    this.licenceId = props.licenceId;
    this.nouvelleDateDebut = props.nouvelleDateDebut;
    this.nouvelleDateFin = props.nouvelleDateFin;
    this.status = props.status;
    this.commentaire = props.commentaire;
    this.valideePar = props.valideePar;
    this.dateValidation = props.dateValidation;
  }

  static create(input: CreateRenouvellementDomainInput): Renouvellement {
    Renouvellement.validateDates(input.nouvelleDateDebut, input.nouvelleDateFin);
    if (input.commentaire !== undefined) Renouvellement.validateCommentaire(input.commentaire);
    return new Renouvellement({
      licenceId: input.licenceId,
      nouvelleDateDebut: input.nouvelleDateDebut,
      nouvelleDateFin: input.nouvelleDateFin,
      status: "EN_COURS",
      commentaire: input.commentaire ?? null,
      valideePar: null,
      dateValidation: null,
    });
  }

  static rehydrate(props: RehydrateRenouvellementProps): PersistedRenouvellement {
    return new PersistedRenouvellement(
      {
        licenceId: props.licenceId,
        nouvelleDateDebut: props.nouvelleDateDebut,
        nouvelleDateFin: props.nouvelleDateFin,
        status: props.status,
        commentaire: props.commentaire,
        valideePar: props.valideePar,
        dateValidation: props.dateValidation,
      },
      props.id,
      props.dateCreation,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      licenceId: this.licenceId,
      nouvelleDateDebut: this.nouvelleDateDebut.toISOString(),
      nouvelleDateFin: this.nouvelleDateFin.toISOString(),
      status: this.status,
    };
  }

  static validateDates(debut: Date, fin: Date): void {
    if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
      throw new ValidationError({ code: "SPX-LIC-741", message: "dates invalides" });
    }
    if (fin.getTime() <= debut.getTime()) {
      throw new ValidationError({
        code: "SPX-LIC-741",
        message: "nouvelleDateFin doit être strictement postérieure à nouvelleDateDebut",
      });
    }
  }

  static validateCommentaire(c: string): void {
    if (c.length > COMMENTAIRE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-741",
        message: `commentaire > ${String(COMMENTAIRE_MAX_LEN)} caractères`,
      });
    }
  }

  static validateStatus(status: string): void {
    if (!VALID_STATUS.has(status as RenewStatus)) {
      throw new ValidationError({
        code: "SPX-LIC-741",
        message: `status "${status}" invalide`,
      });
    }
  }

  /** Transitions autorisées : EN_COURS → VALIDE | ANNULE. Les autres statuts
   *  (VALIDE, CREE, ANNULE) sont terminaux. */
  static canTransition(from: RenewStatus, to: RenewStatus): boolean {
    if (from !== "EN_COURS") return false;
    return to === "VALIDE" || to === "ANNULE";
  }
}

export class PersistedRenouvellement extends Renouvellement {
  readonly id: string;
  readonly dateCreation: Date;

  constructor(props: RenouvellementProps, id: string, dateCreation: Date) {
    super(props);
    this.id = id;
    this.dateCreation = dateCreation;
  }

  withStatus(newStatus: RenewStatus, valideePar: string | null): PersistedRenouvellement {
    Renouvellement.validateStatus(newStatus);
    return new PersistedRenouvellement(
      {
        licenceId: this.licenceId,
        nouvelleDateDebut: this.nouvelleDateDebut,
        nouvelleDateFin: this.nouvelleDateFin,
        status: newStatus,
        commentaire: this.commentaire,
        valideePar: newStatus === "VALIDE" ? valideePar : this.valideePar,
        dateValidation: newStatus === "VALIDE" ? new Date() : this.dateValidation,
      },
      this.id,
      this.dateCreation,
    );
  }

  /** Met à jour les nouvelles dates (Phase 9.A — édition pré-validation).
   *  Le caller doit aussi refuser si status !== EN_COURS au niveau use-case. */
  withDates(nouvelleDateDebut: Date, nouvelleDateFin: Date): PersistedRenouvellement {
    Renouvellement.validateDates(nouvelleDateDebut, nouvelleDateFin);
    return new PersistedRenouvellement(
      {
        licenceId: this.licenceId,
        nouvelleDateDebut,
        nouvelleDateFin,
        status: this.status,
        commentaire: this.commentaire,
        valideePar: this.valideePar,
        dateValidation: this.dateValidation,
      },
      this.id,
      this.dateCreation,
    );
  }

  withCommentaire(commentaire: string | null): PersistedRenouvellement {
    if (commentaire !== null) Renouvellement.validateCommentaire(commentaire);
    return new PersistedRenouvellement(
      {
        licenceId: this.licenceId,
        nouvelleDateDebut: this.nouvelleDateDebut,
        nouvelleDateFin: this.nouvelleDateFin,
        status: this.status,
        commentaire,
        valideePar: this.valideePar,
        dateValidation: this.dateValidation,
      },
      this.id,
      this.dateCreation,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
