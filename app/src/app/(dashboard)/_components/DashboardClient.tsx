// ==============================================================================
// LIC v2 — DashboardClient (Phase 11.A, EC-01)
//
// 4 sections : KPI cards, graphiques (recharts ResponsiveContainer), tableaux
// rapides. Tout en Client Component pour profiter de Recharts (interactions
// hover, animations).
// ==============================================================================

"use client";

import Link from "next/link";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DashboardKpisDTO {
  readonly clientsActifs: number;
  readonly licencesActives: number;
  readonly licencesExpirees: number;
  readonly licencesSuspendues: number;
  readonly renouvellementsEnCours: number;
  readonly notificationsUnread: number;
}

export interface LicenceStatusByMonthDTO {
  readonly month: string;
  readonly actif: number;
  readonly expire: number;
  readonly suspendu: number;
  readonly inactif: number;
}

export interface TopClientDTO {
  readonly clientId: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly licencesCount: number;
}

export interface VolumeAggregateDTO {
  readonly articleCode: string;
  readonly articleNom: string;
  readonly totalAutorise: number;
  readonly totalConsomme: number;
  readonly tauxPct: number;
}

export interface RecentLicenceDTO {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly clientCode: string;
  readonly clientRaisonSociale: string;
  readonly updatedAt: string;
}

export interface RecentRenouvellementDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly licenceReference: string;
  readonly nouvelleDateFin: string;
  readonly dateCreation: string;
}

export interface NotificationCardDTO {
  readonly id: string;
  readonly title: string;
  readonly priority: string;
  readonly createdAt: string;
  readonly href: string | null;
}

export interface DashboardClientProps {
  readonly kpis: DashboardKpisDTO;
  readonly licenceStatusByMonth: readonly LicenceStatusByMonthDTO[];
  readonly topClients: readonly TopClientDTO[];
  readonly volumes: readonly VolumeAggregateDTO[];
  readonly recentLicences: readonly RecentLicenceDTO[];
  readonly recentRenouvellements: readonly RecentRenouvellementDTO[];
  readonly recentNotifications: readonly NotificationCardDTO[];
}

const CHART_COLORS = {
  actif: "var(--color-success)",
  expire: "var(--color-destructive)",
  suspendu: "var(--color-warning)",
  inactif: "var(--color-muted-foreground)",
};

export function DashboardClient(props: DashboardClientProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-foreground text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {/* KPI cards */}
      <section
        aria-label={t("kpisAriaLabel")}
        className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-5"
      >
        <KpiCard label={t("kpis.clientsActifs")} value={props.kpis.clientsActifs} />
        <KpiCard
          label={t("kpis.licencesActives")}
          value={props.kpis.licencesActives}
          tone="success"
        />
        <KpiCard
          label={t("kpis.licencesExpirees")}
          value={props.kpis.licencesExpirees}
          tone="destructive"
        />
        <KpiCard
          label={t("kpis.renouvellementsEnCours")}
          value={props.kpis.renouvellementsEnCours}
          tone="info"
        />
        <KpiCard
          label={t("kpis.notificationsUnread")}
          value={props.kpis.notificationsUnread}
          tone={props.kpis.notificationsUnread > 0 ? "warning" : undefined}
          href="/notifications"
        />
      </section>

      {/* Graphiques */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("charts.licenceStatusByMonth")}>
          {props.licenceStatusByMonth.length === 0 ? (
            <EmptyState message={t("empty.noChart")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[...props.licenceStatusByMonth]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="actif" stackId="a" fill={CHART_COLORS.actif} />
                <Bar dataKey="suspendu" stackId="a" fill={CHART_COLORS.suspendu} />
                <Bar dataKey="expire" stackId="a" fill={CHART_COLORS.expire} />
                <Bar dataKey="inactif" stackId="a" fill={CHART_COLORS.inactif} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title={t("charts.topClients")}>
          {props.topClients.length === 0 ? (
            <EmptyState message={t("empty.noTopClients")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[...props.topClients]}
                layout="vertical"
                margin={{ top: 10, right: 20, bottom: 10, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" stroke="currentColor" fontSize={11} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="codeClient"
                  stroke="currentColor"
                  fontSize={11}
                  width={80}
                />
                <Tooltip
                  formatter={(value: unknown) => [String(value), t("charts.licencesCount")]}
                />
                <Bar dataKey="licencesCount" fill="var(--color-info)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("charts.volumesTopArticles")}>
          {props.volumes.length === 0 ? (
            <EmptyState message={t("empty.noVolumes")} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[...props.volumes]}
                  dataKey="totalConsomme"
                  nameKey="articleCode"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ articleCode, tauxPct }: { articleCode: string; tauxPct: number }) =>
                    `${articleCode} (${String(tauxPct)}%)`
                  }
                >
                  {props.volumes.map((v, i) => (
                    <Cell
                      key={v.articleCode}
                      fill={
                        ["#0070f3", "#00c489", "#ff6b35", "#9c4dff", "#facc15"][i % 5] ?? "#888"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title={t("recent.notifications")}>
          {props.recentNotifications.length === 0 ? (
            <EmptyState message={t("empty.noNotifications")} />
          ) : (
            <ul className="space-y-2 text-sm">
              {props.recentNotifications.map((n) => (
                <li key={n.id} className="border-border rounded-md border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-foreground font-display">{n.title}</p>
                      <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                        {formatDate(n.createdAt)} · {n.priority}
                      </p>
                    </div>
                    {n.href !== null && (
                      <Link href={n.href} className="text-info text-xs underline">
                        {t("recent.open")}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Tableaux rapides */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("recent.licences")}>
          {props.recentLicences.length === 0 ? (
            <EmptyState message={t("empty.noLicences")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recent.refLicence")}</TableHead>
                  <TableHead>{t("recent.client")}</TableHead>
                  <TableHead>{t("recent.status")}</TableHead>
                  <TableHead className="text-right">{t("recent.updatedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.recentLicences.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link
                        href={`/licences/${l.id}/resume`}
                        className="text-info font-mono text-xs underline"
                      >
                        {l.reference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.clientCode} · {l.clientRaisonSociale}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{l.status}</TableCell>
                    <TableCell className="text-right text-xs">{formatDate(l.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card title={t("recent.renouvellements")}>
          {props.recentRenouvellements.length === 0 ? (
            <EmptyState message={t("empty.noRenouvellements")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recent.refLicence")}</TableHead>
                  <TableHead>{t("recent.nouvelleDateFin")}</TableHead>
                  <TableHead className="text-right">{t("recent.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.recentRenouvellements.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/licences/${r.licenceId}/renouvellements`}
                        className="text-info font-mono text-xs underline"
                      >
                        {r.licenceReference}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{r.nouvelleDateFin.slice(0, 10)}</TableCell>
                    <TableCell className="text-right text-xs">
                      {formatDate(r.dateCreation)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  href,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone?: "success" | "destructive" | "warning" | "info";
  readonly href?: string;
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning"
          : tone === "info"
            ? "text-info"
            : "text-foreground";
  const inner = (
    <div className="border-border bg-surface-1 rounded-md border p-4">
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p className={`font-display mt-2 text-3xl tabular-nums ${toneCls}`}>
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
  if (href !== undefined) {
    return (
      <Link href={href} className="hover:bg-accent block rounded-md transition">
        {inner}
      </Link>
    );
  }
  return inner;
}

function Card({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface-1 rounded-md border p-4">
      <h2 className="font-display text-foreground mb-3 text-base">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
      {message}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
