// ==============================================================================
// LIC v2 — ExportLicencesCsvUseCase (Phase 11.B EC-09)
//
// Itère le repository licences avec cursor jusqu'à épuisement (cap 100k via
// SPX-LIC-755 — pattern Phase 7.C). Construit un CSV RFC 4180.
// ==============================================================================

import { ConflictError } from "@/server/modules/error";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { LicenceStatus } from "@/server/modules/licence/domain/licence.entity";

const MAX_EXPORT_ROWS = 100_000;
const BATCH_LIMIT = 200;

export interface ExportLicencesCsvInput {
  readonly clientId?: string;
  readonly status?: LicenceStatus;
}

export class ExportLicencesCsvUseCase {
  constructor(private readonly licenceRepository: LicenceRepository) {}

  async execute(input: ExportLicencesCsvInput): Promise<string> {
    const lines: string[] = [
      [
        "id",
        "reference",
        "clientId",
        "entiteId",
        "dateDebut",
        "dateFin",
        "status",
        "renouvellementAuto",
        "version",
        "dateCreation",
      ]
        .map(escapeCsv)
        .join(","),
    ];

    let cursor: string | undefined;
    let pulled = 0;
    while (pulled < MAX_EXPORT_ROWS) {
      const page = await this.licenceRepository.findPaginated({
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
        limit: BATCH_LIMIT,
      });
      for (const l of page.items) {
        lines.push(
          [
            l.id,
            l.reference,
            l.clientId,
            l.entiteId,
            l.dateDebut.toISOString(),
            l.dateFin.toISOString(),
            l.status,
            l.renouvellementAuto ? "true" : "false",
            String(l.version),
            l.dateCreation.toISOString(),
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
        message: `Export licences refusé : > ${String(MAX_EXPORT_ROWS)} lignes. Affinez les filtres.`,
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
