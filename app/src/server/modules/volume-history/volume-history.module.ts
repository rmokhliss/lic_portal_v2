// ==============================================================================
// LIC v2 — Composition root du module volume-history (Phase 6 étape 6.D)
// Read-only + recordVolumeSnapshot — pas d'audit (donnée calculée).
// ==============================================================================

import { VolumeHistoryRepositoryPg } from "./adapters/postgres/volume-history.repository.pg";
import { ListVolumeHistoryUseCase } from "./application/list-volume-history.usecase";
import { RecordVolumeSnapshotUseCase } from "./application/record-volume-snapshot.usecase";
import type { VolumeHistoryRepository } from "./ports/volume-history.repository";

export const volumeHistoryRepository: VolumeHistoryRepository = new VolumeHistoryRepositoryPg();

export const recordVolumeSnapshotUseCase = new RecordVolumeSnapshotUseCase(volumeHistoryRepository);
export const listVolumeHistoryUseCase = new ListVolumeHistoryUseCase(volumeHistoryRepository);
