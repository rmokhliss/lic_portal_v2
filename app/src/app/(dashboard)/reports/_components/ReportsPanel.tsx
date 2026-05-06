// ==============================================================================
// LIC v2 — ReportsPanel (Phase 11.B EC-09)
//
// 3 cartes export CSV : licences / renouvellements / audit. Filtres simples.
// Cap 100k lignes côté backend (SPX-LIC-755). Téléchargement via blob URL.
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  exportAuditCsvReportAction,
  exportLicencesCsvAction,
  exportLicencesPdfAction,
  exportLicencesXlsxAction,
  exportRenouvellementsCsvAction,
  exportRenouvellementsPdfAction,
  exportRenouvellementsXlsxAction,
} from "../_actions";

export interface ClientOption {
  readonly id: string;
  readonly label: string;
}

export interface ReportsPanelProps {
  readonly clients: readonly ClientOption[];
}

export function ReportsPanel(props: ReportsPanelProps) {
  const t = useTranslations("rapports");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-foreground text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      <LicencesReport clients={props.clients} />
      <RenouvellementsReport clients={props.clients} />
      <AuditReport />
    </div>
  );
}

function ReportCard({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="border-border rounded-md border p-4">
      <header className="mb-3">
        <h2 className="font-display text-foreground text-base">{title}</h2>
        <p className="text-muted-foreground text-xs">{description}</p>
      </header>
      {children}
    </section>
  );
}

function LicencesReport({ clients }: { readonly clients: readonly ClientOption[] }) {
  const t = useTranslations("rapports.licences");
  const tCommon = useTranslations("rapports");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);

  const collectFilters = (): { clientId?: string; status?: string } => {
    if (formRef === null) return {};
    const fd = new FormData(formRef);
    const out: { clientId?: string; status?: string } = {};
    const clientIdRaw = strOpt(fd.get("clientId"));
    const statusRaw = strOpt(fd.get("status"));
    if (clientIdRaw !== undefined) out.clientId = clientIdRaw;
    if (statusRaw !== undefined) out.status = statusRaw;
    return out;
  };

  const exportCsv = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { csv } = await exportLicencesCsvAction(collectFilters());
          downloadCsv(csv, `licences-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const exportXlsx = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { filename, base64 } = await exportLicencesXlsxAction(collectFilters());
          downloadBinary(
            base64,
            filename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const exportPdf = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { filename, base64 } = await exportLicencesPdfAction(collectFilters());
          downloadBinary(base64, filename, "application/pdf");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const onExport = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    exportCsv();
  };

  return (
    <ReportCard title={t("title")} description={t("description")}>
      <form ref={setFormRef} onSubmit={onExport} className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="lic-client">{tCommon("filters.client")}</Label>
          <select
            id="lic-client"
            name="clientId"
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{tCommon("filters.clientAll")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="lic-status">{tCommon("filters.status")}</Label>
          <select
            id="lic-status"
            name="status"
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{tCommon("filters.statusAll")}</option>
            <option value="ACTIF">ACTIF</option>
            <option value="SUSPENDU">SUSPENDU</option>
            <option value="EXPIRE">EXPIRE</option>
            <option value="INACTIF">INACTIF</option>
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? tCommon("exporting") : "Export CSV"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={exportXlsx}>
            Export Excel
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={exportPdf}>
            Export PDF
          </Button>
        </div>
        {error !== "" && <p className="text-destructive text-xs md:col-span-3">{error}</p>}
      </form>
    </ReportCard>
  );
}

function RenouvellementsReport({ clients }: { readonly clients: readonly ClientOption[] }) {
  const t = useTranslations("rapports.renouvellements");
  const tCommon = useTranslations("rapports");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);

  const collectFilters = (): Record<string, string> => {
    if (formRef === null) return {};
    const fd = new FormData(formRef);
    const out: Record<string, string> = {};
    const clientId = strOpt(fd.get("clientId"));
    const status = strOpt(fd.get("status"));
    const fromDate = strOpt(fd.get("fromDate"));
    const toDate = strOpt(fd.get("toDate"));
    if (clientId !== undefined) out.clientId = clientId;
    if (status !== undefined) out.status = status;
    if (fromDate !== undefined) out.fromDate = fromDate;
    if (toDate !== undefined) out.toDate = toDate;
    return out;
  };

  const exportCsv = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { csv } = await exportRenouvellementsCsvAction(collectFilters());
          downloadCsv(csv, `renouvellements-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const exportXlsx = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { filename, base64 } = await exportRenouvellementsXlsxAction(collectFilters());
          downloadBinary(
            base64,
            filename,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const exportPdf = () => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const { filename, base64 } = await exportRenouvellementsPdfAction(collectFilters());
          downloadBinary(base64, filename, "application/pdf");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  const onExport = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    exportCsv();
  };

  return (
    <ReportCard title={t("title")} description={t("description")}>
      <form ref={setFormRef} onSubmit={onExport} className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="renouv-client">{tCommon("filters.client")}</Label>
          <select
            id="renouv-client"
            name="clientId"
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{tCommon("filters.clientAll")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="renouv-status">{tCommon("filters.status")}</Label>
          <select
            id="renouv-status"
            name="status"
            className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{tCommon("filters.statusAll")}</option>
            <option value="EN_COURS">EN_COURS</option>
            <option value="VALIDE">VALIDE</option>
            <option value="CREE">CREE</option>
            <option value="ANNULE">ANNULE</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="renouv-from">{tCommon("filters.fromDate")}</Label>
          <Input id="renouv-from" name="fromDate" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="renouv-to">{tCommon("filters.toDate")}</Label>
          <Input id="renouv-to" name="toDate" type="date" />
        </div>
        <div className="flex items-end gap-2 md:col-span-5">
          <Button type="submit" disabled={pending}>
            {pending ? tCommon("exporting") : "Export CSV"}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={exportXlsx}>
            Export Excel
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={exportPdf}>
            Export PDF
          </Button>
        </div>
        {error !== "" && <p className="text-destructive text-xs md:col-span-5">{error}</p>}
      </form>
    </ReportCard>
  );
}

function AuditReport() {
  const t = useTranslations("rapports.audit");
  const tCommon = useTranslations("rapports");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onExport = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, string> = {};
    const action = strOpt(fd.get("action"));
    const entity = strOpt(fd.get("entity"));
    const fromDate = strOpt(fd.get("fromDate"));
    const toDate = strOpt(fd.get("toDate"));
    if (action !== undefined) payload.action = action;
    if (entity !== undefined) payload.entity = entity;
    if (fromDate !== undefined) payload.fromDate = fromDate;
    if (toDate !== undefined) payload.toDate = toDate;
    startTransition(() => {
      void (async () => {
        try {
          const { csv } = await exportAuditCsvReportAction(payload);
          downloadCsv(csv, `audit-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <ReportCard title={t("title")} description={t("description")}>
      <form onSubmit={onExport} className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="audit-action">{t("action")}</Label>
          <Input id="audit-action" name="action" placeholder="LICENCE_CREATED" maxLength={40} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-entity">{t("entity")}</Label>
          <Input id="audit-entity" name="entity" placeholder="licence" maxLength={40} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-from">{tCommon("filters.fromDate")}</Label>
          <Input id="audit-from" name="fromDate" type="date" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-to">{tCommon("filters.toDate")}</Label>
          <Input id="audit-to" name="toDate" type="date" />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? tCommon("exporting") : tCommon("export")}
          </Button>
        </div>
        {error !== "" && <p className="text-destructive text-xs md:col-span-5">{error}</p>}
      </form>
    </ReportCard>
  );
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Phase 18 R-21 — décodage base64 → Blob → trigger download. Server Action
 *  retourne le buffer encodé en base64 (Next.js Server Actions sérialisent
 *  les types primitifs ; un ArrayBuffer brut est moins fiable). */
function downloadBinary(base64: string, filename: string, mime: string) {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArray], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function strOpt(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length === 0 ? undefined : s;
}
