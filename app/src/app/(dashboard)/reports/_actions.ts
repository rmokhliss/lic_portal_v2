// ==============================================================================
// LIC v2 — Server Actions /reports (Phase 11.B EC-09 + Phase 16 + Phase 18 R-21)
// ADMIN/SADMIN only. Cap export 100k lignes (SPX-LIC-755).
//
// Phase 16 — DETTE-LIC-022 résolue : audit best-effort EXPORT_CSV_LICENCES /
// EXPORT_CSV_RENOUVELLEMENTS posé après chaque export réussi.
//
// Phase 18 R-21 — exports XLSX (exceljs) + PDF (puppeteer) en plus du CSV.
// Les libs sont lazy-importées dans chaque action (pas d'import statique top
// du fichier) pour éviter de tirer puppeteer/exceljs sur toutes les routes
// qui touchent /reports/_actions.ts (chaîne composition-root). Pattern aligné
// fix(infrastructure) Phase 17 R-19 mjml externalize.
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  exportAuditCsvUseCase,
  exportLicencesCsvUseCase,
  exportRenouvellementsCsvUseCase,
  recordAuditEntryUseCase,
} from "@/server/composition-root";
import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("reports/actions");

/** Phase 16 — audit best-effort pour les exports CSV (DETTE-LIC-022). */
async function auditExport(
  action: "EXPORT_CSV_LICENCES" | "EXPORT_CSV_RENOUVELLEMENTS",
  actorId: string,
  actorDisplay: string,
  filters: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAuditEntryUseCase.execute({
      entity: "report",
      entityId: actorId, // pas d'entité métier unique — on lie à l'acteur.
      action,
      afterData: filters,
      userId: actorId,
      userDisplay: actorDisplay,
      mode: "MANUEL",
    });
  } catch (err) {
    log.warn(
      {
        event: "audit_export_failed",
        action,
        error: err instanceof Error ? err.message : String(err),
      },
      "Échec audit export CSV best-effort (CSV livré OK)",
    );
  }
}

const ExportLicencesSchema = z
  .object({
    clientId: z.uuid().optional(),
    status: z.enum(["ACTIF", "INACTIF", "SUSPENDU", "EXPIRE"]).optional(),
  })
  .strict();

const ExportRenouvellementsSchema = z
  .object({
    clientId: z.uuid().optional(),
    status: z.enum(["EN_COURS", "VALIDE", "CREE", "ANNULE"]).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

const ExportAuditSchema = z
  .object({
    action: z.string().max(40).optional(),
    entity: z.string().max(40).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

export async function exportLicencesCsvAction(input: unknown): Promise<{ csv: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportLicencesSchema.parse(input);
  const csv = await exportLicencesCsvUseCase.execute({
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
  });
  // Phase 16 — audit best-effort EXPORT_CSV_LICENCES.
  await auditExport("EXPORT_CSV_LICENCES", actor.id, actor.display, parsed);
  return { csv };
}

export async function exportRenouvellementsCsvAction(input: unknown): Promise<{ csv: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportRenouvellementsSchema.parse(input);
  const csv = await exportRenouvellementsCsvUseCase.execute({
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  // Phase 16 — audit best-effort EXPORT_CSV_RENOUVELLEMENTS.
  await auditExport("EXPORT_CSV_RENOUVELLEMENTS", actor.id, actor.display, parsed);
  return { csv };
}

export async function exportAuditCsvReportAction(input: unknown): Promise<{ csv: string }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportAuditSchema.parse(input);
  const csv = await exportAuditCsvUseCase.execute({
    ...(parsed.action !== undefined ? { action: parsed.action } : {}),
    ...(parsed.entity !== undefined ? { entity: parsed.entity } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  return { csv };
}

// ============================================================================
// Phase 18 R-21 — Exports XLSX (exceljs) + PDF (puppeteer)
// ============================================================================

interface RowsBundle {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
  readonly title: string;
  readonly filename: string;
}

/** Parse le CSV existant (use cases v1) en rows + headers. Évite de
 *  réimplémenter la pagination cursor + cap 100k déjà solides côté
 *  use case CSV. Le CSV produit par exportLicencesCsv* est RFC 4180 (sep
 *  comma, CRLF lignes, double-quote escape). */
function parseSimpleCsv(csv: string): { headers: string[]; rows: string[][] } {
  // Séparation par lignes — gère les valeurs entre guillemets.
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      const next = csv[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\r" || ch === "\n") && !inQuotes) {
      if (current.length > 0) lines.push(current);
      current = "";
      if (ch === "\r" && csv[i + 1] === "\n") i++;
    } else {
      current += ch ?? "";
    }
  }
  if (current.length > 0) lines.push(current);

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let buf = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (q && next === '"') {
          buf += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (ch === "," && !q) {
        out.push(buf);
        buf = "";
      } else {
        buf += ch ?? "";
      }
    }
    out.push(buf);
    return out;
  };

  const all = lines.map(splitRow);
  return { headers: all[0] ?? [], rows: all.slice(1) };
}

async function buildXlsx(bundle: RowsBundle): Promise<Buffer> {
  // Lazy import — exceljs est dans serverExternalPackages, chargé à
  // l'invocation Server Action et non au render des pages.
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Licence Manager S2M";
  wb.created = new Date();
  const ws = wb.addWorksheet(bundle.title);
  ws.addRow([...bundle.headers]);
  // Style de la ligne d'en-tête.
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0066D6" }, // SPX blue 600
  };
  // Données.
  for (const r of bundle.rows) {
    ws.addRow([...r]);
  }
  // Auto-width approximatif (max 60 chars/colonne).
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const raw = cell.value;
      const v =
        raw === null || raw === undefined
          ? ""
          : typeof raw === "string"
            ? raw
            : typeof raw === "number" || typeof raw === "boolean"
              ? String(raw)
              : "";
      if (v.length > maxLen) maxLen = Math.min(60, v.length);
    });
    col.width = maxLen + 2;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function buildPdf(bundle: RowsBundle): Promise<Buffer> {
  // Lazy import — puppeteer embarque Chromium, chargé uniquement au
  // moment de l'export PDF.
  const puppeteer = await import("puppeteer");
  const html = renderPdfHtml(bundle);
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function renderPdfHtml(bundle: RowsBundle): string {
  const escapeHtml = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const headerCells = bundle.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyRows = bundle.rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join("")}</tr>`)
    .join("");
  const generatedAt = new Date().toLocaleString("fr-FR");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(bundle.title)}</title>
  <style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #333; }
    h1 { color: #0066D6; font-size: 18px; margin: 0 0 8px; }
    .meta { color: #666; font-size: 9px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0066D6; color: white; padding: 6px 8px; text-align: left; font-size: 9px; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; font-size: 9px; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${escapeHtml(bundle.title)}</h1>
  <p class="meta">Généré le ${escapeHtml(generatedAt)} — ${String(bundle.rows.length)} ligne(s)</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

export async function exportLicencesXlsxAction(
  input: unknown,
): Promise<{ filename: string; base64: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportLicencesSchema.parse(input);
  const csv = await exportLicencesCsvUseCase.execute({
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
  });
  const { headers, rows } = parseSimpleCsv(csv);
  const buf = await buildXlsx({ headers, rows, title: "Licences", filename: "licences" });
  await auditExport("EXPORT_CSV_LICENCES", actor.id, actor.display, {
    ...parsed,
    format: "XLSX",
  });
  return {
    filename: `licences-${new Date().toISOString().slice(0, 10)}.xlsx`,
    base64: buf.toString("base64"),
  };
}

export async function exportLicencesPdfAction(
  input: unknown,
): Promise<{ filename: string; base64: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportLicencesSchema.parse(input);
  const csv = await exportLicencesCsvUseCase.execute({
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
  });
  const { headers, rows } = parseSimpleCsv(csv);
  const buf = await buildPdf({ headers, rows, title: "Licences", filename: "licences" });
  await auditExport("EXPORT_CSV_LICENCES", actor.id, actor.display, {
    ...parsed,
    format: "PDF",
  });
  return {
    filename: `licences-${new Date().toISOString().slice(0, 10)}.pdf`,
    base64: buf.toString("base64"),
  };
}

export async function exportRenouvellementsXlsxAction(
  input: unknown,
): Promise<{ filename: string; base64: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportRenouvellementsSchema.parse(input);
  const csv = await exportRenouvellementsCsvUseCase.execute({
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  const { headers, rows } = parseSimpleCsv(csv);
  const buf = await buildXlsx({
    headers,
    rows,
    title: "Renouvellements",
    filename: "renouvellements",
  });
  await auditExport("EXPORT_CSV_RENOUVELLEMENTS", actor.id, actor.display, {
    ...parsed,
    format: "XLSX",
  });
  return {
    filename: `renouvellements-${new Date().toISOString().slice(0, 10)}.xlsx`,
    base64: buf.toString("base64"),
  };
}

export async function exportRenouvellementsPdfAction(
  input: unknown,
): Promise<{ filename: string; base64: string }> {
  const actor = await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ExportRenouvellementsSchema.parse(input);
  const csv = await exportRenouvellementsCsvUseCase.execute({
    ...(parsed.status !== undefined ? { status: parsed.status } : {}),
    ...(parsed.clientId !== undefined ? { clientId: parsed.clientId } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
  });
  const { headers, rows } = parseSimpleCsv(csv);
  const buf = await buildPdf({
    headers,
    rows,
    title: "Renouvellements",
    filename: "renouvellements",
  });
  await auditExport("EXPORT_CSV_RENOUVELLEMENTS", actor.id, actor.display, {
    ...parsed,
    format: "PDF",
  });
  return {
    filename: `renouvellements-${new Date().toISOString().slice(0, 10)}.pdf`,
    base64: buf.toString("base64"),
  };
}
