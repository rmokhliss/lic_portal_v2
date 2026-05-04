// ==============================================================================
// LIC v2 — ListVolumeHistoryUseCase (Phase 6 étape 6.D)
// Read-only. Cursor pagination via repo.
// ==============================================================================

import { toDTO, type VolumeHistoryDTO } from "../adapters/postgres/volume-history.mapper";
import type {
  ListVolumeHistoryFilters,
  VolumeHistoryRepository,
} from "../ports/volume-history.repository";

export interface ListVolumeHistoryPage {
  readonly items: readonly VolumeHistoryDTO[];
  readonly nextCursor: string | null;
}

export type ListVolumeHistoryInput = ListVolumeHistoryFilters;

export class ListVolumeHistoryUseCase {
  constructor(private readonly volumeHistoryRepository: VolumeHistoryRepository) {}

  async execute(input: ListVolumeHistoryInput = {}): Promise<ListVolumeHistoryPage> {
    const page = await this.volumeHistoryRepository.listPaginated(input);
    return {
      items: page.items.map(toDTO),
      nextCursor: page.nextCursor,
    };
  }
}
