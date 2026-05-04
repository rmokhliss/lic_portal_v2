// ==============================================================================
// LIC v2 — Entité ArticleVolumeSnapshot (Phase 6 étape 6.D)
//
// Append-only : pas de mutateurs. Crée par le job snapshot Phase 8 ou
// manuellement via SADMIN. Pas d'audit (donnée calculée).
//
// `periode` = date pure (premier jour du mois). Stockée DATE côté BD.
// Validation : volumes >= 0 (CHECK BD + SPX-LIC-753).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

export interface CreateArticleVolumeSnapshotInput {
  readonly licenceId: string;
  readonly articleId: number;
  readonly periode: Date;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export interface RehydrateArticleVolumeSnapshotProps {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  readonly periode: Date;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
  readonly snapshotAt: Date;
  readonly createdAt: Date;
}

interface SnapshotProps {
  readonly licenceId: string;
  readonly articleId: number;
  readonly periode: Date;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export class ArticleVolumeSnapshot {
  readonly licenceId: string;
  readonly articleId: number;
  readonly periode: Date;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;

  protected constructor(props: SnapshotProps) {
    this.licenceId = props.licenceId;
    this.articleId = props.articleId;
    this.periode = props.periode;
    this.volumeAutorise = props.volumeAutorise;
    this.volumeConsomme = props.volumeConsomme;
  }

  static create(input: CreateArticleVolumeSnapshotInput): ArticleVolumeSnapshot {
    ArticleVolumeSnapshot.validateVolume(input.volumeAutorise);
    ArticleVolumeSnapshot.validateVolume(input.volumeConsomme);
    return new ArticleVolumeSnapshot({
      licenceId: input.licenceId,
      articleId: input.articleId,
      periode: input.periode,
      volumeAutorise: input.volumeAutorise,
      volumeConsomme: input.volumeConsomme,
    });
  }

  static rehydrate(props: RehydrateArticleVolumeSnapshotProps): PersistedArticleVolumeSnapshot {
    return new PersistedArticleVolumeSnapshot(
      {
        licenceId: props.licenceId,
        articleId: props.articleId,
        periode: props.periode,
        volumeAutorise: props.volumeAutorise,
        volumeConsomme: props.volumeConsomme,
      },
      props.id,
      props.snapshotAt,
      props.createdAt,
    );
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

export class PersistedArticleVolumeSnapshot extends ArticleVolumeSnapshot {
  readonly id: string;
  readonly snapshotAt: Date;
  readonly createdAt: Date;

  constructor(props: SnapshotProps, id: string, snapshotAt: Date, createdAt: Date) {
    super(props);
    this.id = id;
    this.snapshotAt = snapshotAt;
    this.createdAt = createdAt;
  }
}
