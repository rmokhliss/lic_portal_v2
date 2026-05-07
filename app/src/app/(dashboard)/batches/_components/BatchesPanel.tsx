// ==============================================================================
// LIC v2 — BatchesPanel (Phase 8.D, EC-12)
//
// Tableau jobs + dernières exécutions + bouton "Lancer maintenant" + drill-down
// vers les logs (Dialog).
// ==============================================================================

"use client";

import { useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { runJobNowAction } from "../_actions";

export interface BatchExecutionDTO {
  readonly id: string;
  readonly status: string;
  readonly declencheur: string;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly errorMessage: string | null;
  readonly stats: Record<string, unknown> | null;
}

export interface BatchLogDTO {
  readonly id: string;
  readonly level: string;
  readonly message: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface BatchJobItem {
  readonly code: string;
  readonly libelle: string;
  readonly description: string | null;
  readonly schedule: string | null;
  readonly lastExecution: BatchExecutionDTO | null;
}

export interface BatchesPanelProps {
  readonly jobs: readonly BatchJobItem[];
  readonly executionsByJob: Readonly<Record<string, readonly BatchExecutionDTO[]>>;
  readonly logsByExecution: Readonly<Record<string, readonly BatchLogDTO[]>>;
  readonly canRun: boolean;
}

export function BatchesPanel(props: BatchesPanelProps) {
  const t = useTranslations("batches");
  const [drilldownExec, setDrilldownExec] = useState<BatchExecutionDTO | null>(null);
  const [pendingJob, setPendingJob] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  const onRun = (code: string) => {
    setError("");
    setPendingJob(code);
    startTransition(() => {
      void (async () => {
        try {
          await runJobNowAction({ jobCode: code });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        } finally {
          setPendingJob(null);
        }
      })();
    });
  };

  return (
    <>
      <div>
        <h1 className="font-display text-foreground text-xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {error !== "" && <p className="text-destructive mt-2 text-sm">{error}</p>}

      <div className="mt-6 space-y-6">
        {props.jobs.map((job) => {
          const execs = props.executionsByJob[job.code] ?? [];
          return (
            <section key={job.code} className="border-border rounded-md border p-4">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-foreground text-base">
                    {job.libelle}{" "}
                    <span className="text-muted-foreground font-mono text-xs">({job.code})</span>
                  </h2>
                  {job.description !== null && (
                    <p className="text-muted-foreground mt-1 text-sm">{job.description}</p>
                  )}
                  {job.schedule !== null && (
                    <p className="text-muted-foreground mt-1 font-mono text-xs">
                      {t("scheduleLabel")} : {job.schedule}
                    </p>
                  )}
                </div>
                {props.canRun && (
                  <Button
                    type="button"
                    disabled={pending && pendingJob === job.code}
                    onClick={() => {
                      onRun(job.code);
                    }}
                  >
                    {pending && pendingJob === job.code ? t("running") : t("runNow")}
                  </Button>
                )}
              </header>

              {/* Phase 23 — mini-timeline sparkline des dernières exécutions
                   (statut couleur + durée relative), vue d'oeil sur la santé
                   du job avant le détail tabulaire. */}
              {execs.length > 0 && (
                <div className="mt-3 flex items-end gap-1" aria-label="Timeline exécutions">
                  {[...execs].reverse().map((exec) => (
                    <div
                      key={`spark-${exec.id}`}
                      className={`w-4 rounded-sm ${sparklineColor(exec.status)}`}
                      style={{
                        height: `${String(sparklineHeight(exec.startedAt, exec.endedAt))}px`,
                      }}
                      title={`${exec.status} · ${formatDuration(exec.startedAt, exec.endedAt)}`}
                    />
                  ))}
                </div>
              )}

              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.startedAt")}</TableHead>
                    <TableHead>{t("table.declencheur")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.duration")}</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {execs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                        {t("noExecutions")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    execs.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="font-mono text-xs">
                          {exec.startedAt === null ? "-" : formatDate(exec.startedAt)}
                        </TableCell>
                        <TableCell className="text-xs">{exec.declencheur}</TableCell>
                        <TableCell>
                          <StatusBadge status={exec.status} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDuration(exec.startedAt, exec.endedAt)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {summarizeItems(exec.stats)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDrilldownExec(exec);
                            }}
                          >
                            {t("seeLogs")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
          );
        })}
      </div>

      <LogsDialog
        exec={drilldownExec}
        logs={drilldownExec === null ? [] : (props.logsByExecution[drilldownExec.id] ?? [])}
        onClose={() => {
          setDrilldownExec(null);
        }}
      />
    </>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: "bg-success/15 text-success",
    RUNNING: "bg-info/15 text-info",
    FAILED: "bg-destructive/15 text-destructive",
    QUEUED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-muted text-muted-foreground",
  };
  const cls = styles[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-xs ${cls}`}>
      {status}
    </span>
  );
}

function LogsDialog({
  exec,
  logs,
  onClose,
}: {
  readonly exec: BatchExecutionDTO | null;
  readonly logs: readonly BatchLogDTO[];
  readonly onClose: () => void;
}) {
  const t = useTranslations("batches.logs");
  if (exec === null) return null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t("title")} — {exec.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {/* Phase 23 — résumé en grille au lieu de JSON brut. */}
          <div className="border-border bg-muted/30 grid grid-cols-2 gap-2 rounded-md border p-3 text-xs sm:grid-cols-4">
            <Stat label="Statut" value={exec.status} />
            <Stat label="Déclencheur" value={exec.declencheur} />
            <Stat
              label="Démarré"
              value={exec.startedAt === null ? "—" : formatDate(exec.startedAt)}
            />
            <Stat label="Durée" value={formatDuration(exec.startedAt, exec.endedAt)} />
            {exec.stats !== null &&
              Object.entries(exec.stats).map(([k, v]) => (
                <Stat key={k} label={k} value={String(v)} />
              ))}
          </div>

          {exec.errorMessage !== null && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3">
              <p className="text-xs font-semibold">Erreur principale</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{exec.errorMessage}</pre>
            </div>
          )}

          <div>
            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">
              Logs ({logs.length})
            </p>
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-xs">{t("empty")}</p>
            ) : (
              <ul className="bg-muted/20 max-h-96 space-y-0.5 overflow-auto rounded-md p-2 text-xs">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className={`border-border rounded px-2 py-1 ${
                      log.level === "ERROR"
                        ? "bg-destructive/10"
                        : log.level === "WARN"
                          ? "bg-warning/10"
                          : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono">
                        {formatDate(log.createdAt)}
                      </span>
                      <LevelBadge level={log.level} />
                      <span className="text-foreground flex-1">{log.message}</span>
                    </div>
                    {log.metadata !== null && Object.keys(log.metadata).length > 0 && (
                      <pre className="text-muted-foreground ml-2 mt-1 whitespace-pre-wrap font-mono text-[10px]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LevelBadge({ level }: { readonly level: string }) {
  const cls =
    level === "ERROR"
      ? "text-destructive"
      : level === "WARN"
        ? "text-warning"
        : level === "DEBUG"
          ? "text-muted-foreground"
          : "text-info";
  return <span className={`font-mono text-xs ${cls}`}>[{level}]</span>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (start === null) return "-";
  if (end === null) return "...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${String(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Phase 23 — stat label/value pour le LogsDialog (alternative au JSON brut). */
function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-foreground font-mono text-xs tabular-nums">{value}</p>
    </div>
  );
}

/** Phase 23 — extrait les compteurs métier depuis stats pour la colonne "Items"
 *  de la table : "created/skipped/errors" pour snapshot-volumes, etc. Format
 *  "+N traités" pour vue rapide. */
function summarizeItems(stats: Record<string, unknown> | null): string {
  if (stats === null) return "—";
  const candidates = ["created", "processed", "updated", "deleted", "expired", "renewed"];
  for (const k of candidates) {
    const v = stats[k];
    if (typeof v === "number") return `${String(v)} ${k}`;
  }
  // fallback : premier number trouvé
  for (const [k, v] of Object.entries(stats)) {
    if (typeof v === "number") return `${String(v)} ${k}`;
  }
  return "—";
}

/** Phase 23 — couleur barre sparkline selon statut. */
function sparklineColor(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "bg-success/70";
    case "FAILED":
      return "bg-destructive/70";
    case "RUNNING":
      return "bg-info/70";
    case "QUEUED":
    case "CANCELLED":
      return "bg-muted-foreground/40";
    default:
      return "bg-muted-foreground/30";
  }
}

/** Phase 23 — hauteur barre sparkline proportionnelle à la durée (4-32px). */
function sparklineHeight(start: string | null, end: string | null): number {
  if (start === null || end === null) return 8;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  // log scale 100ms → 60s
  const clamped = Math.max(100, Math.min(60_000, ms));
  return Math.round(4 + 28 * (Math.log10(clamped / 100) / Math.log10(600)));
}
