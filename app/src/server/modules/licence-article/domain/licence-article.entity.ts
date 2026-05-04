// ==============================================================================
// LIC v2 — Entité LicenceArticle (Phase 6 étape 6.C)
//
// Article d'une licence avec volume autorisé/consommé. PK uuidv7.
// Mutation = audit obligatoire (changement de contrat).
//
// Validation volumes : entiers >= 0 (règle L2 + CHECK BD).
// Mutation withVolumeAutorise : retourne nouvelle instance + le caller doit
// passer modifiePar dans repository.update().
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export interface LicenceArticleProps {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export interface RehydrateLicenceArticleProps {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
  readonly creePar: string | null;
  readonly modifiePar: string | null;
}

export interface CreateLicenceArticleInput {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number;
  readonly volumeConsomme?: number;
}

export class LicenceArticle {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;

  protected constructor(props: LicenceArticleProps) {
    this.licenceId = props.licenceId;
    this.articleId = props.articleId;
    this.volumeAutorise = props.volumeAutorise;
    this.volumeConsomme = props.volumeConsomme;
  }

  static create(input: CreateLicenceArticleInput): LicenceArticle {
    LicenceArticle.validateVolume(input.volumeAutorise);
    if (input.volumeConsomme !== undefined) {
      LicenceArticle.validateVolume(input.volumeConsomme);
    }
    return new LicenceArticle({
      licenceId: input.licenceId,
      articleId: input.articleId,
      volumeAutorise: input.volumeAutorise,
      volumeConsomme: input.volumeConsomme ?? 0,
    });
  }

  static rehydrate(props: RehydrateLicenceArticleProps): PersistedLicenceArticle {
    return new PersistedLicenceArticle(
      {
        licenceId: props.licenceId,
        articleId: props.articleId,
        volumeAutorise: props.volumeAutorise,
        volumeConsomme: props.volumeConsomme,
      },
      props.id,
      props.creePar,
      props.modifiePar,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      licenceId: this.licenceId,
      articleId: this.articleId,
      volumeAutorise: this.volumeAutorise,
      volumeConsomme: this.volumeConsomme,
    };
  }

  static validateVolume(v: number): void {
    if (!Number.isInteger(v) || v < 0) {
      throw new ValidationError({
        code: "SPX-LIC-753",
        message: `Volume invalide : ${String(v)} (entier >= 0 attendu)`,
      });
    }
  }
}

export class PersistedLicenceArticle extends LicenceArticle {
  readonly id: string;
  readonly creePar: string | null;
  readonly modifiePar: string | null;

  constructor(
    props: LicenceArticleProps,
    id: string,
    creePar: string | null,
    modifiePar: string | null,
  ) {
    super(props);
    this.id = id;
    this.creePar = creePar;
    this.modifiePar = modifiePar;
  }

  withVolumeAutorise(v: number): PersistedLicenceArticle {
    LicenceArticle.validateVolume(v);
    return new PersistedLicenceArticle(
      {
        licenceId: this.licenceId,
        articleId: this.articleId,
        volumeAutorise: v,
        volumeConsomme: this.volumeConsomme,
      },
      this.id,
      this.creePar,
      this.modifiePar,
    );
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
