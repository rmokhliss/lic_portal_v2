// ==============================================================================
// LIC v2 — ExportLicencesCsvUseCase (Phase 11.B EC-09)
//
// Itère le repository licences avec cursor jusqu'à épuisement (cap 100k via
// SPX-LIC-755 — pattern Phase 7.C). Construit un CSV RFC 4180 avec colonnes
// humaines (libellés FR + lookup client/entité). Le CSV est ré-utilisé pour
// les exports XLSX et PDF (cf. reports/_actions.ts → parseSimpleCsv).
// ==============================================================================

import type { ClientRepository } from "@/server/modules/client/ports/client.repository";
import type { EntiteRepository } from "@/server/modules/entite/ports/entite.repository";
import { ConflictError } from "@/server/modules/error";
import type { LicenceStatus } from "@/server/modules/licence/domain/licence.entity";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";

const MAX_EXPORT_ROWS = 100_000;
const BATCH_LIMIT = 200;

const STATUS_LABEL: Record<LicenceStatus, string> = {
  ACTIF: "Active",
  INACTIF: "Inactive",
  SUSPENDU: "Suspendue",
  EXPIRE: "Expirée",
};

export interface ExportLicencesCsvInput {
  readonly clientId?: string;
  readonly status?: LicenceStatus;
}

export class ExportLicencesCsvUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly clientRepository: ClientRepository,
    private readonly entiteRepository: EntiteRepository,
  ) {}

  async execute(input: ExportLicencesCsvInput): Promise<string> {
    const lines: string[] = [
      [
        "Référence",
        "Code client",
        "Raison sociale",
        "Entité",
        "Date début",
        "Date fin",
        "Statut",
        "Renouvellement auto",
        "Date création",
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
      if (page.items.length === 0) break;

      // Résolution batch client + entité (dédupliquée) pour éviter le N+1.
      const uniqueClientIds = Array.from(new Set(page.items.map((l) => l.clientId)));
      const uniqueEntiteIds = Array.from(new Set(page.items.map((l) => l.entiteId)));
      const [clientsArr, entitesArr] = await Promise.all([
        Promise.all(uniqueClientIds.map((id) => this.clientRepository.findById(id))),
        Promise.all(uniqueEntiteIds.map((id) => this.entiteRepository.findById(id))),
      ]);
      const clientById = new Map(
        clientsArr.flatMap((c) => (c === null ? [] : [[c.id, c] as const])),
      );
      const entiteById = new Map(
        entitesArr.flatMap((e) => (e === null ? [] : [[e.id, e] as const])),
      );

      for (const l of page.items) {
        const c = clientById.get(l.clientId);
        const e = entiteById.get(l.entiteId);
        lines.push(
          [
            l.reference,
            c?.codeClient ?? "—",
            c?.raisonSociale ?? "—",
            e?.nom ?? "—",
            formatDateFr(l.dateDebut),
            formatDateFr(l.dateFin),
            STATUS_LABEL[l.status],
            l.renouvellementAuto ? "Oui" : "Non",
            formatDateTimeFr(l.dateCreation),
          ]
            .map(escapeCsv)
            .join(","),
        );
      }
      pulled += page.items.length;
      if (page.nextCursor === null) break;
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

function formatDateFr(d: Date): string {
  // DD/MM/YYYY — date pure, pas d'heure (TIMESTAMPTZ stocké en UTC mais
  // dateDebut/dateFin sont des dates métier sans timezone côté UI).
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function formatDateTimeFr(d: Date): string {
  // DD/MM/YYYY HH:mm — timestamp création, on garde l'horodatage pour traçabilité.
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = String(d.getUTCFullYear());
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
