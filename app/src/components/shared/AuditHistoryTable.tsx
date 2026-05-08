// ==============================================================================
// LIC v2 — AuditHistoryTable (Phase 7.B partagé clients/licences/audit global)
//
// Table générique d'affichage du journal d'audit. Pagination cursor "Voir plus"
// + filtres action + acteur (input texte). Hydraté par fetcher serveur (la
// page parent fait le 1er fetch puis injecte les pages suivantes via cursor).
//
// Le bouton "Charger plus" rend la pagination simple côté UI (pas de scroll
// infini — risque de re-fetch infini sur écrans haute densité). Le drill-down
// sur une row ouvre un Dialog read-only avec before/after JSON formaté.
// ==============================================================================

"use client";

import { useEffect, useState, useTransition } from "react";

import { useTranslations } from "next-intl";

import {
  resolveAuditIdsAction,
  type ResolveAuditIdsResult,
} from "@/app/(dashboard)/audit/_actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface AuditEntryClientDTO {
  readonly id: string;
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeData: Record<string, unknown> | null;
  readonly afterData: Record<string, unknown> | null;
  readonly userId: string;
  readonly userDisplay: string;
  readonly clientId: string | null;
  readonly clientDisplay: string | null;
  readonly ipAddress: string | null;
  readonly mode: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
}

export interface AuditPageClientDTO {
  readonly items: readonly AuditEntryClientDTO[];
  readonly nextCursor: string | null;
}

export type AuditFetcher = (input: {
  cursor?: string;
  action?: string;
  acteur?: string;
}) => Promise<AuditPageClientDTO>;

export interface AuditHistoryTableProps {
  readonly initialPage: AuditPageClientDTO;
  readonly fetchPage: AuditFetcher;
  /** Liste des actions disponibles dans le filtre select (calculé serveur). */
  readonly actionsCatalog: readonly string[];
}

export function AuditHistoryTable(props: AuditHistoryTableProps) {
  const t = useTranslations("audit.history");
  const [items, setItems] = useState<readonly AuditEntryClientDTO[]>(props.initialPage.items);
  const [nextCursor, setNextCursor] = useState<string | null>(props.initialPage.nextCursor);
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterActeur, setFilterActeur] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [drilldown, setDrilldown] = useState<AuditEntryClientDTO | null>(null);

  const refetch = (resetCursor: boolean) => {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const page = await props.fetchPage({
            cursor: resetCursor ? undefined : (nextCursor ?? undefined),
            action: filterAction === "" ? undefined : filterAction,
            acteur: filterActeur.trim() === "" ? undefined : filterActeur.trim(),
          });
          if (resetCursor) {
            setItems(page.items);
          } else {
            setItems([...items, ...page.items]);
          }
          setNextCursor(page.nextCursor);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erreur");
        }
      })();
    });
  };

  return (
    <>
      <div className="border-border bg-muted/40 mb-4 rounded-md border p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="filter-action">{t("filter.action")}</Label>
            <select
              id="filter-action"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
              }}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">{t("filter.actionAll")}</option>
              {props.actionsCatalog.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="filter-acteur">{t("filter.acteur")}</Label>
            <Input
              id="filter-acteur"
              value={filterActeur}
              onChange={(e) => {
                setFilterActeur(e.target.value);
              }}
              placeholder={t("filter.acteurPlaceholder")}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => {
                refetch(true);
              }}
              disabled={pending}
            >
              {pending ? t("filter.applying") : t("filter.apply")}
            </Button>
          </div>
        </div>
      </div>

      {error !== "" && <p className="text-destructive mb-2 text-sm">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("table.date")}</TableHead>
            <TableHead>{t("table.acteur")}</TableHead>
            <TableHead>{t("table.action")}</TableHead>
            <TableHead>{t("table.entity")}</TableHead>
            <TableHead>{t("table.mode")}</TableHead>
            <TableHead className="text-right">{t("table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {formatDate(entry.createdAt)}
                </TableCell>
                <TableCell className="text-sm">{entry.userDisplay}</TableCell>
                <TableCell>
                  <span className="bg-muted rounded-full px-2 py-0.5 font-mono text-xs">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{entry.entity}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{entry.mode}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDrilldown(entry);
                    }}
                  >
                    {t("table.drill")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {nextCursor !== null && (
        <div className="mt-4 flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              refetch(false);
            }}
          >
            {pending ? t("loadMoreLoading") : t("loadMore")}
          </Button>
        </div>
      )}

      <DrilldownDialog
        entry={drilldown}
        onClose={() => {
          setDrilldown(null);
        }}
      />
    </>
  );
}

function DrilldownDialog({
  entry,
  onClose,
}: {
  readonly entry: AuditEntryClientDTO | null;
  readonly onClose: () => void;
}) {
  const t = useTranslations("audit.history.drill");
  const [resolved, setResolved] = useState<ResolveAuditIdsResult | null>(null);

  // Phase 24 — résolution des UUIDs présents dans before/after vers libellés
  // affichables (clientCode·raisonSociale, entiteNom, licence reference, etc.).
  // Évite que le user lise des UUIDs bruts dans le JSON.
  useEffect(() => {
    if (entry === null) {
      setResolved(null);
      return;
    }
    const ids = extractAuditIds(entry);
    if (
      ids.clientIds.length === 0 &&
      ids.entiteIds.length === 0 &&
      ids.licenceIds.length === 0 &&
      ids.userIds.length === 0 &&
      ids.articleIds.length === 0 &&
      ids.produitIds.length === 0
    ) {
      setResolved(null);
      return;
    }
    const state = { cancelled: false };
    void (async () => {
      try {
        const r = await resolveAuditIdsAction(ids);
        if (!state.cancelled) setResolved(r);
      } catch {
        if (!state.cancelled) setResolved(null);
      }
    })();
    return () => {
      state.cancelled = true;
    };
  }, [entry]);

  if (entry === null) return null;

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
            {entry.action} — {entry.entity} · {entry.entityId.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-muted-foreground">{t("date")}</dt>
            <dd className="font-mono text-xs">{formatDate(entry.createdAt)}</dd>
            <dt className="text-muted-foreground">{t("acteur")}</dt>
            <dd>{entry.userDisplay}</dd>
            <dt className="text-muted-foreground">{t("mode")}</dt>
            <dd>{entry.mode}</dd>
            {entry.ipAddress !== null && (
              <>
                <dt className="text-muted-foreground">{t("ip")}</dt>
                <dd className="font-mono text-xs">{entry.ipAddress}</dd>
              </>
            )}
            {entry.clientDisplay !== null && (
              <>
                <dt className="text-muted-foreground">{t("client")}</dt>
                <dd>{entry.clientDisplay}</dd>
              </>
            )}
          </dl>

          {resolved !== null && <ResolvedIdsPanel resolved={resolved} />}

          {entry.beforeData !== null && (
            <section>
              <h3 className="font-display text-foreground mb-1 text-sm">{t("before")}</h3>
              <pre className="bg-muted text-foreground max-h-64 overflow-auto rounded-md p-3 font-mono text-xs">
                {JSON.stringify(entry.beforeData, null, 2)}
              </pre>
            </section>
          )}
          {entry.afterData !== null && (
            <section>
              <h3 className="font-display text-foreground mb-1 text-sm">{t("after")}</h3>
              <pre className="bg-muted text-foreground max-h-64 overflow-auto rounded-md p-3 font-mono text-xs">
                {JSON.stringify(entry.afterData, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResolvedIdsPanel({ resolved }: { readonly resolved: ResolveAuditIdsResult }) {
  const rows: { label: string; uuid: string; display: string }[] = [];
  for (const [id, display] of Object.entries(resolved.clients)) {
    rows.push({ label: "Client", uuid: id, display });
  }
  for (const [id, display] of Object.entries(resolved.entites)) {
    rows.push({ label: "Entité", uuid: id, display });
  }
  for (const [id, display] of Object.entries(resolved.licences)) {
    rows.push({ label: "Licence", uuid: id, display });
  }
  for (const [id, display] of Object.entries(resolved.users)) {
    rows.push({ label: "Utilisateur", uuid: id, display });
  }
  for (const [id, display] of Object.entries(resolved.articles)) {
    rows.push({ label: "Article", uuid: id, display });
  }
  for (const [id, display] of Object.entries(resolved.produits)) {
    rows.push({ label: "Produit", uuid: id, display });
  }
  if (rows.length === 0) return null;
  return (
    <section className="border-border bg-muted/40 rounded-md border p-3">
      <h3 className="text-foreground mb-2 text-xs font-medium uppercase tracking-wider">
        Identifiants résolus
      </h3>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.label}-${r.uuid}`} className="border-border/50 border-t first:border-0">
              <td className="text-muted-foreground py-1 pr-2">{r.label}</td>
              <td className="text-foreground py-1 pr-2">{r.display}</td>
              <td className="text-muted-foreground/70 py-1 font-mono text-[10px]">
                {r.uuid.length > 12 ? `${r.uuid.slice(0, 8)}…` : r.uuid}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Extrait les UUIDs/IDs connus depuis le JSON before/after pour résolution. */
function extractAuditIds(entry: AuditEntryClientDTO): {
  clientIds: string[];
  entiteIds: string[];
  licenceIds: string[];
  userIds: string[];
  articleIds: number[];
  produitIds: number[];
} {
  const out = {
    clientIds: new Set<string>(),
    entiteIds: new Set<string>(),
    licenceIds: new Set<string>(),
    userIds: new Set<string>(),
    articleIds: new Set<number>(),
    produitIds: new Set<number>(),
  };
  // Inclut le clientId du DTO entry si non null (cas où afterData ne le porte pas).
  if (entry.clientId !== null) out.clientIds.add(entry.clientId);
  if (entry.userId.length > 0) out.userIds.add(entry.userId);
  // Si l'entité du log est elle-même un licence/client/etc., l'entityId est l'UUID.
  if (entry.entity === "licence") out.licenceIds.add(entry.entityId);
  if (entry.entity === "client") out.clientIds.add(entry.entityId);

  const visit = (val: unknown): void => {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      for (const v of val) visit(v);
      return;
    }
    if (typeof val !== "object") return;
    for (const [key, raw] of Object.entries(val as Record<string, unknown>)) {
      if (typeof raw === "string" && raw.length > 0) {
        if (key === "clientId") out.clientIds.add(raw);
        else if (key === "entiteId") out.entiteIds.add(raw);
        else if (key === "licenceId") out.licenceIds.add(raw);
        else if (key === "userId" || key === "actorId") out.userIds.add(raw);
      } else if (typeof raw === "number") {
        if (key === "articleId") out.articleIds.add(raw);
        else if (key === "produitId") out.produitIds.add(raw);
      } else if (raw !== null && typeof raw === "object") {
        visit(raw);
      }
    }
  };
  visit(entry.beforeData);
  visit(entry.afterData);
  visit(entry.metadata);
  return {
    clientIds: [...out.clientIds],
    entiteIds: [...out.entiteIds],
    licenceIds: [...out.licenceIds],
    userIds: [...out.userIds],
    articleIds: [...out.articleIds],
    produitIds: [...out.produitIds],
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
