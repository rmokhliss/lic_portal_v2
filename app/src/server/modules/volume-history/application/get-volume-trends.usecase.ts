// ==============================================================================
// LIC v2 — GetVolumeTrendsUseCase (Phase 23 — EC-04 tendance + projection)
//
// Read-only. Agrège lic_article_volume_history par (licence_id, article_id)
// et calcule pour chaque couple :
//   - série historique (12 derniers mois max)
//   - dernier snapshot
//   - tendance ↗↘→ (compare les 3 derniers snapshots)
//   - projection (date estimée de dépassement vol_autorise contractuel)
//
// Cf. PROJECT_CONTEXT_LIC.md L601 "EC-04 Suivi articles : Tendance + Projection
// + édition inline + modal LineChart 12 mois". Ce use-case alimente la table
// /volumes ; le modal LineChart est rendu côté client à partir de la série
// historique exposée ici.
// ==============================================================================

import { sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";

export type Tendance = "UP" | "DOWN" | "FLAT";
export type ProjectionKind = "ON_TIME" | "TIGHT" | "EXCEEDED" | "NA";

export interface VolumeSnapshotPoint {
  readonly periode: string; // YYYY-MM-DD
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export interface VolumeTrendRow {
  readonly licenceId: string;
  readonly articleId: number;
  readonly history: readonly VolumeSnapshotPoint[];
  readonly latest: VolumeSnapshotPoint;
  readonly tendance: Tendance;
  readonly projection: {
    readonly kind: ProjectionKind;
    /** ISO date YYYY-MM-DD si TIGHT (dépassement projeté avant date_fin licence). */
    readonly estimatedExceedDate: string | null;
  };
}

export interface GetVolumeTrendsInput {
  /** Limite le nombre de mois remontés par couple licence×article (défaut 12). */
  readonly months?: number;
}

interface VolumeRow extends Record<string, unknown> {
  readonly licence_id: string;
  readonly article_id: number;
  readonly periode: string;
  readonly volume_autorise: number;
  readonly volume_consomme: number;
  readonly licence_date_fin: Date;
}

const TREND_THRESHOLD_PCT = 5; // ±5% pour basculer UP/DOWN vs FLAT

export class GetVolumeTrendsUseCase {
  async execute(input: GetVolumeTrendsInput = {}): Promise<readonly VolumeTrendRow[]> {
    const months = input.months ?? 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    // SELECT joinant volume_history + licence (pour date_fin), ordonné par
    // (licence, article, periode ASC) pour faciliter le groupement.
    const rowsRes = await db.execute<VolumeRow>(sql`
      SELECT
        h.licence_id,
        h.article_id,
        TO_CHAR(h.periode, 'YYYY-MM-DD') AS periode,
        h.volume_autorise,
        h.volume_consomme,
        l.date_fin AS licence_date_fin
      FROM lic_article_volume_history h
      JOIN lic_licences l ON l.id = h.licence_id
      WHERE h.periode >= ${cutoffStr}::date
      ORDER BY h.licence_id, h.article_id, h.periode ASC
    `);
    const rows = rowsRes as unknown as readonly VolumeRow[];

    // Group by (licenceId, articleId).
    const groups = new Map<string, VolumeRow[]>();
    for (const r of rows) {
      const key = `${r.licence_id}|${String(r.article_id)}`;
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }

    const out: VolumeTrendRow[] = [];
    for (const [, points] of groups) {
      const latestRow = points[points.length - 1];
      if (latestRow === undefined) continue;
      const history: VolumeSnapshotPoint[] = points.map((p) => ({
        periode: p.periode,
        volumeAutorise: p.volume_autorise,
        volumeConsomme: p.volume_consomme,
      }));
      const latest: VolumeSnapshotPoint = {
        periode: latestRow.periode,
        volumeAutorise: latestRow.volume_autorise,
        volumeConsomme: latestRow.volume_consomme,
      };
      out.push({
        licenceId: latestRow.licence_id,
        articleId: latestRow.article_id,
        history,
        latest,
        tendance: computeTendance(history),
        projection: computeProjection(history, latestRow.licence_date_fin),
      });
    }

    return out;
  }
}

/** Tendance basée sur les 3 derniers snapshots : pente moyenne du %
 *  consommation. <3 points → FLAT. */
function computeTendance(history: readonly VolumeSnapshotPoint[]): Tendance {
  if (history.length < 3) return "FLAT";
  const last3 = history.slice(-3);
  const ratios = last3.map((p) =>
    p.volumeAutorise > 0 ? (p.volumeConsomme / p.volumeAutorise) * 100 : 0,
  );
  const r0 = ratios[0] ?? 0;
  const r2 = ratios[2] ?? 0;
  const delta = r2 - r0;
  if (delta > TREND_THRESHOLD_PCT) return "UP";
  if (delta < -TREND_THRESHOLD_PCT) return "DOWN";
  return "FLAT";
}

/** Projection : extrapole la pente consommation entre les 3 derniers points
 *  pour estimer la date où le cumul atteindrait volumeAutorise. Comparée à
 *  date_fin licence pour qualifier ON_TIME / TIGHT / EXCEEDED. */
function computeProjection(
  history: readonly VolumeSnapshotPoint[],
  licenceDateFin: Date,
): { kind: ProjectionKind; estimatedExceedDate: string | null } {
  const latest = history[history.length - 1];
  if (latest === undefined || latest.volumeAutorise <= 0) {
    return { kind: "NA", estimatedExceedDate: null };
  }
  if (latest.volumeConsomme >= latest.volumeAutorise) {
    return { kind: "EXCEEDED", estimatedExceedDate: null };
  }
  if (history.length < 2) {
    return { kind: "ON_TIME", estimatedExceedDate: null };
  }
  // Pente : delta_consomme par jour entre les 2 derniers points.
  const prev = history[history.length - 2];
  if (prev === undefined) return { kind: "ON_TIME", estimatedExceedDate: null };
  const tPrev = new Date(prev.periode).getTime();
  const tLatest = new Date(latest.periode).getTime();
  const days = Math.max(1, (tLatest - tPrev) / (1000 * 60 * 60 * 24));
  const slope = (latest.volumeConsomme - prev.volumeConsomme) / days;
  if (slope <= 0) {
    return { kind: "ON_TIME", estimatedExceedDate: null };
  }
  const remaining = latest.volumeAutorise - latest.volumeConsomme;
  const daysToExceed = remaining / slope;
  const exceedDate = new Date(tLatest + daysToExceed * 24 * 60 * 60 * 1000);

  if (exceedDate >= licenceDateFin) {
    return { kind: "ON_TIME", estimatedExceedDate: null };
  }
  return {
    kind: "TIGHT",
    estimatedExceedDate: exceedDate.toISOString().slice(0, 10),
  };
}
