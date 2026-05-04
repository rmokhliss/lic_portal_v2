// ==============================================================================
// LIC v2 — ExportAuditCsvUseCase (Phase 7 étape 7.C)
//
// Génère un export CSV en streaming. Refuse si count() > MAX_EXPORT_ROWS
// pour protéger la mémoire serveur (SPX-LIC-755).
//
// Format CSV : RFC 4180. Séparateur `,`. Quoting des champs contenant `,`,
// `"`, `\n`. JSONB before/after sérialisés en string compacte.
//
// Pas d'audit (lecture). ADMIN/SADMIN seulement (vérifié en Server Action).
// ==============================================================================

import { ConflictError } from "@/server/modules/error";

import { toDTO } from "../adapters/postgres/audit-query.dto";
import type { AuditQueryFilters, AuditQueryRepository } from "../ports/audit-query.repository";

const MAX_EXPORT_ROWS = 50_000;
/** Pagination interne pour limiter la mémoire — on accumule par batch de 200
 *  jusqu'à count total. */
const BATCH_LIMIT = 200;

export class ExportAuditCsvUseCase {
  constructor(private readonly auditQueryRepository: AuditQueryRepository) {}

  /** Retourne le CSV en string complet (pas de streaming HTTP — Server Action
   *  retourne un body Response, le caller wrap en `new Response(csv, ...)`). */
  async execute(filters: AuditQueryFilters): Promise<string> {
    const total = await this.auditQueryRepository.count(filters);
    if (total > MAX_EXPORT_ROWS) {
      throw new ConflictError({
        code: "SPX-LIC-755",
        message: `Export refusé : ${String(total)} lignes (max ${String(MAX_EXPORT_ROWS)}). Affinez les filtres.`,
        details: { total, max: MAX_EXPORT_ROWS },
      });
    }

    const lines: string[] = [
      [
        "id",
        "createdAt",
        "userDisplay",
        "userId",
        "action",
        "entity",
        "entityId",
        "clientDisplay",
        "mode",
        "ipAddress",
        "beforeData",
        "afterData",
      ]
        .map(escapeCsv)
        .join(","),
    ];

    let cursor: string | undefined;
    let pulled = 0;
    while (pulled < total) {
      const page = await this.auditQueryRepository.search({
        ...filters,
        cursor,
        limit: BATCH_LIMIT,
      });
      for (const entry of page.items) {
        const dto = toDTO(entry);
        lines.push(
          [
            dto.id,
            dto.createdAt,
            dto.userDisplay,
            dto.userId,
            dto.action,
            dto.entity,
            dto.entityId,
            dto.clientDisplay ?? "",
            dto.mode,
            dto.ipAddress ?? "",
            dto.beforeData === null ? "" : JSON.stringify(dto.beforeData),
            dto.afterData === null ? "" : JSON.stringify(dto.afterData),
          ]
            .map(escapeCsv)
            .join(","),
        );
      }
      pulled += page.items.length;
      if (page.nextCursor === null || page.items.length === 0) break;
      cursor = page.nextCursor;
    }

    return lines.join("\r\n") + "\r\n";
  }
}

function escapeCsv(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
