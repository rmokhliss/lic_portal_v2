// ==============================================================================
// LIC v2 — Entité LicenceArticle (Phase 6 étape 6.C + Phase 23 nullable)
//
// Article d'une licence avec volume autorisé/consommé. PK uuidv7.
// Mutation = audit obligatoire (changement de contrat).
//
// Phase 23 — volumes nullable : NULL = volume non défini (équivalent métier
// d'illimité côté UI / .lic / .hc). Validation : NULL OU entier >= 0.
// Articles fonctionnalité (controle_volume=false) ont toujours leurs volumes
// à NULL ; articles volumétriques peuvent être créés sans volume puis
// renseignés plus tard.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export interface LicenceArticleProps {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number | null;
  readonly volumeConsomme: number | null;
}

export interface RehydrateLicenceArticleProps {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number | null;
  readonly volumeConsomme: number | null;
  readonly creePar: string | null;
  readonly modifiePar: string | null;
}

export interface CreateLicenceArticleInput {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number | null;
  readonly volumeConsomme?: number | null;
}

export class LicenceArticle {
  readonly licenceId: string;
  readonly articleId: number;
  readonly volumeAutorise: number | null;
  readonly volumeConsomme: number | null;

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
      volumeConsomme: input.volumeConsomme ?? null,
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

  /** NULL ou entier >= 0. NULL = volume non défini / illimité métier. */
  static validateVolume(v: number | null): void {
    if (v === null) return;
    if (!Number.isInteger(v) || v < 0) {
      throw new ValidationError({
        code: "SPX-LIC-753",
        message: `Volume invalide : ${String(v)} (entier >= 0 ou null attendu)`,
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

  withVolumeAutorise(v: number | null): PersistedLicenceArticle {
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
