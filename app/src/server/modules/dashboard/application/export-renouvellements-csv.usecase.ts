// ==============================================================================
// LIC v2 — ExportRenouvellementsCsvUseCase (Phase 11.B EC-09)
//
// Cap 100k lignes (SPX-LIC-755). Cursor pagination via repo.searchPaginated.
// ==============================================================================

import { ConflictError } from "@/server/modules/error";
import type { RenewStatus } from "@/server/modules/renouvellement/domain/renouvellement.entity";
import type { RenouvellementRepository } from "@/server/modules/renouvellement/ports/renouvellement.repository";

const MAX_EXPORT_ROWS = 100_000;
const BATCH_LIMIT = 200;

export interface ExportRenouvellementsCsvInput {
  readonly status?: RenewStatus;
  readonly clientId?: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
}

export class ExportRenouvellementsCsvUseCase {
  constructor(private readonly renouvellementRepository: RenouvellementRepository) {}

  async execute(input: ExportRenouvellementsCsvInput): Promise<string> {
    const lines: string[] = [
      [
        "id",
        "licenceId",
        "nouvelleDateDebut",
        "nouvelleDateFin",
        "status",
        "valideePar",
        "dateValidation",
        "commentaire",
        "dateCreation",
      ]
        .map(escapeCsv)
        .join(","),
    ];

    let cursor: string | undefined;
    let pulled = 0;
    while (pulled < MAX_EXPORT_ROWS) {
      const page = await this.renouvellementRepository.searchPaginated({
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.fromDate !== undefined ? { fromDate: input.fromDate } : {}),
        ...(input.toDate !== undefined ? { toDate: input.toDate } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
        limit: BATCH_LIMIT,
      });
      for (const r of page.items) {
        lines.push(
          [
            r.id,
            r.licenceId,
            r.nouvelleDateDebut.toISOString(),
            r.nouvelleDateFin.toISOString(),
            r.status,
            r.valideePar ?? "",
            r.dateValidation === null ? "" : r.dateValidation.toISOString(),
            r.commentaire ?? "",
            r.dateCreation.toISOString(),
          ]
            .map(escapeCsv)
            .join(","),
        );
      }
      pulled += page.items.length;
      if (page.nextCursor === null || page.items.length === 0) break;
      cursor = page.nextCursor;
    }

    if (pulled >= MAX_EXPORT_ROWS) {
      throw new ConflictError({
        code: "SPX-LIC-755",
        message: `Export renouvellements refusé : > ${String(MAX_EXPORT_ROWS)} lignes. Affinez les filtres.`,
        details: { max: MAX_EXPORT_ROWS },
      });
    }

    return lines.join("\r\n") + "\r\n";
  }
}

function escapeCsv(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
