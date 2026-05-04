// ==============================================================================
// LIC v2 — Entité FichierLog (Phase 10 étape 10.B)
//
// Append-only : pas de mutateur post-création. Pas d'audit (DEC-019 — la
// table est elle-même la trace).
// ==============================================================================

export type FichierType = "LIC_GENERATED" | "HEALTHCHECK_IMPORTED";
export type FichierStatut = "GENERATED" | "IMPORTED" | "ERREUR";

export interface CreateFichierLogInput {
  readonly licenceId: string;
  readonly type: FichierType;
  readonly statut: FichierStatut;
  readonly path: string;
  readonly hash: string;
  readonly metadata?: Record<string, unknown>;
  readonly errorMessage?: string;
  readonly creePar?: string;
}

export interface RehydrateFichierLogProps {
  readonly id: string;
  readonly licenceId: string;
  readonly type: FichierType;
  readonly statut: FichierStatut;
  readonly path: string;
  readonly hash: string;
  readonly metadata: Record<string, unknown> | null;
  readonly errorMessage: string | null;
  readonly creePar: string | null;
  readonly createdAt: Date;
}

interface FichierLogProps {
  readonly licenceId: string;
  readonly type: FichierType;
  readonly statut: FichierStatut;
  readonly path: string;
  readonly hash: string;
  readonly metadata: Record<string, unknown> | null;
  readonly errorMessage: string | null;
  readonly creePar: string | null;
}

export class FichierLog {
  readonly licenceId: string;
  readonly type: FichierType;
  readonly statut: FichierStatut;
  readonly path: string;
  readonly hash: string;
  readonly metadata: Record<string, unknown> | null;
  readonly errorMessage: string | null;
  readonly creePar: string | null;

  protected constructor(props: FichierLogProps) {
    this.licenceId = props.licenceId;
    this.type = props.type;
    this.statut = props.statut;
    this.path = props.path;
    this.hash = props.hash;
    this.metadata = props.metadata;
    this.errorMessage = props.errorMessage;
    this.creePar = props.creePar;
  }

  static create(input: CreateFichierLogInput): FichierLog {
    return new FichierLog({
      licenceId: input.licenceId,
      type: input.type,
      statut: input.statut,
      path: input.path,
      hash: input.hash,
      metadata: input.metadata ?? null,
      errorMessage: input.errorMessage ?? null,
      creePar: input.creePar ?? null,
    });
  }

  static rehydrate(props: RehydrateFichierLogProps): PersistedFichierLog {
    return new PersistedFichierLog(
      {
        licenceId: props.licenceId,
        type: props.type,
        statut: props.statut,
        path: props.path,
        hash: props.hash,
        metadata: props.metadata,
        errorMessage: props.errorMessage,
        creePar: props.creePar,
      },
      props.id,
      props.createdAt,
    );
  }
}

export class PersistedFichierLog extends FichierLog {
  readonly id: string;
  readonly createdAt: Date;

  constructor(props: FichierLogProps, id: string, createdAt: Date) {
    super(props);
    this.id = id;
    this.createdAt = createdAt;
  }
}
