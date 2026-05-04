// ==============================================================================
// LIC v2 — RecordVolumeSnapshotUseCase (Phase 6 étape 6.D)
//
// Crée un snapshot mensuel. Pas d'audit (donnée calculée).
// Conflit unique (licence, article, periode) → SPX-LIC-754.
// ==============================================================================

import { isAppError } from "@/server/modules/error";

import { toDTO, type VolumeHistoryDTO } from "../adapters/postgres/volume-history.mapper";
import { ArticleVolumeSnapshot } from "../domain/article-volume-snapshot.entity";
import { snapshotAlreadyExists } from "../domain/volume-history.errors";
import type { VolumeHistoryRepository } from "../ports/volume-history.repository";

/** Detecte un postgres unique_violation (SQLSTATE 23505) indépendamment du
 *  wrap Drizzle (err.cause peut contenir le PostgresError natif). */
function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (/unique/i.test(err.message)) return true;
  const cause = (err as { cause?: unknown }).cause;
  if (cause === undefined || cause === null) return false;
  if (
    typeof cause === "object" &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "23505"
  ) {
    return true;
  }
  if (cause instanceof Error && /unique/i.test(cause.message)) return true;
  return false;
}

export interface RecordVolumeSnapshotInput {
  readonly licenceId: string;
  readonly articleId: number;
  readonly periode: Date;
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export class RecordVolumeSnapshotUseCase {
  constructor(private readonly volumeHistoryRepository: VolumeHistoryRepository) {}

  async execute(input: RecordVolumeSnapshotInput): Promise<VolumeHistoryDTO> {
    const snapshot = ArticleVolumeSnapshot.create(input);

    try {
      const persisted = await this.volumeHistoryRepository.save(snapshot);
      return toDTO(persisted);
    } catch (err) {
      if (isAppError(err)) throw err;
      if (isUniqueViolation(err)) {
        throw snapshotAlreadyExists(input.licenceId, input.articleId, input.periode);
      }
      throw err;
    }
  }
}
