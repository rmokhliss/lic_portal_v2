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

              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.startedAt")}</TableHead>
                    <TableHead>{t("table.declencheur")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.duration")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {execs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
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
        <div className="space-y-2 text-sm">
          {exec.errorMessage !== null && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-xs">
              {exec.errorMessage}
            </div>
          )}
          {exec.stats !== null && Object.keys(exec.stats).length > 0 && (
            <pre className="bg-muted text-foreground max-h-32 overflow-auto rounded-md p-2 font-mono text-xs">
              {JSON.stringify(exec.stats, null, 2)}
            </pre>
          )}
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t("empty")}</p>
          ) : (
            <ul className="bg-muted/40 max-h-96 overflow-auto rounded-md p-2 text-xs">
              {logs.map((log) => (
                <li key={log.id} className="border-border border-b py-1 last:border-0">
                  <span className="text-muted-foreground font-mono">
                    {formatDate(log.createdAt)}
                  </span>{" "}
                  <LevelBadge level={log.level} />{" "}
                  <span className="text-foreground">{log.message}</span>
                  {log.metadata !== null && (
                    <pre className="text-muted-foreground mt-0.5 font-mono">
                      {JSON.stringify(log.metadata)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
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
