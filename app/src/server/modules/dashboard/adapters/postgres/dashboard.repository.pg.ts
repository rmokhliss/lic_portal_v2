// ==============================================================================
// LIC v2 — Adapter Postgres DashboardRepository (Phase 11.A)
//
// Agrégats SQL via db.execute (raw) — préféré à db.select car les agrégats
// (COUNT, GROUP BY date_trunc, JOIN) sont plus naturels en SQL pur.
//
// R-38 : caster manuellement les TIMESTAMPTZ retournées par db.execute si
// utilisées en Date côté JS. Ici on retourne tout en string ISO côté DTO.
// ==============================================================================

import { sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";

import {
  DashboardRepository,
  type DashboardKpis,
  type DbTransaction,
  type LicenceStatusByMonthPoint,
  type RecentLicence,
  type RecentRenouvellement,
  type TopClientByLicences,
  type VolumeAggregate,
} from "../../ports/dashboard.repository";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

interface KpiRow extends Record<string, unknown> {
  readonly clients_actifs: string;
  readonly licences_actives: string;
  readonly licences_expirees: string;
  readonly licences_suspendues: string;
  readonly renouvellements_en_cours: string;
}

interface LicenceMonthRow extends Record<string, unknown> {
  readonly month: string;
  readonly status: string;
  readonly count: string;
}

interface TopClientRow extends Record<string, unknown> {
  readonly client_id: string;
  readonly code_client: string;
  readonly raison_sociale: string;
  readonly licences_count: string;
}

interface VolumeRow extends Record<string, unknown> {
  readonly article_code: string;
  readonly article_nom: string;
  readonly total_autorise: string;
  readonly total_consomme: string;
}

interface RecentLicenceRow extends Record<string, unknown> {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly code_client: string;
  readonly raison_sociale: string;
  readonly updated_at: Date | string;
}

interface RecentRenouvRow extends Record<string, unknown> {
  readonly id: string;
  readonly licence_id: string;
  readonly licence_reference: string;
  readonly nouvelle_date_fin: Date | string;
  readonly created_at: Date | string;
}

function toIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  // postgres-js retourne souvent les TIMESTAMPTZ en string ISO via db.execute (R-38).
  return new Date(v).toISOString();
}

export class DashboardRepositoryPg extends DashboardRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async getKpis(tx?: DbTransaction): Promise<DashboardKpis> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target.execute<KpiRow>(sql`
      SELECT
        (SELECT count(*)::text FROM lic_clients WHERE statut_client = 'ACTIF') AS clients_actifs,
        (SELECT count(*)::text FROM lic_licences WHERE status = 'ACTIF') AS licences_actives,
        (SELECT count(*)::text FROM lic_licences WHERE status = 'EXPIRE') AS licences_expirees,
        (SELECT count(*)::text FROM lic_licences WHERE status = 'SUSPENDU') AS licences_suspendues,
        (SELECT count(*)::text FROM lic_renouvellements WHERE status = 'EN_COURS') AS renouvellements_en_cours
    `);
    const rows = result as unknown as readonly KpiRow[];
    const row = rows[0];
    if (row === undefined) {
      return {
        clientsActifs: 0,
        licencesActives: 0,
        licencesExpirees: 0,
        licencesSuspendues: 0,
        renouvellementsEnCours: 0,
      };
    }
    return {
      clientsActifs: Number(row.clients_actifs),
      licencesActives: Number(row.licences_actives),
      licencesExpirees: Number(row.licences_expirees),
      licencesSuspendues: Number(row.licences_suspendues),
      renouvellementsEnCours: Number(row.renouvellements_en_cours),
    };
  }

  async getLicenceStatusByMonth(
    monthsBack: number,
    tx?: DbTransaction,
  ): Promise<readonly LicenceStatusByMonthPoint[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    // Group by month + status sur la fenêtre [NOW - monthsBack mois, NOW].
    // On compte les licences existantes à chaque mois (snapshot par created_at).
    const result = await target.execute<LicenceMonthRow>(sql`
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        status,
        count(*)::text AS count
      FROM lic_licences
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(String(monthsBack))} months'
      GROUP BY 1, 2
      ORDER BY 1
    `);
    const rows = result as unknown as readonly LicenceMonthRow[];
    const byMonth = new Map<string, LicenceStatusByMonthPoint>();
    for (const r of rows) {
      const m = r.month;
      const existing = byMonth.get(m) ?? {
        month: m,
        actif: 0,
        expire: 0,
        suspendu: 0,
        inactif: 0,
      };
      const c = Number(r.count);
      byMonth.set(m, {
        month: existing.month,
        actif: r.status === "ACTIF" ? existing.actif + c : existing.actif,
        expire: r.status === "EXPIRE" ? existing.expire + c : existing.expire,
        suspendu: r.status === "SUSPENDU" ? existing.suspendu + c : existing.suspendu,
        inactif: r.status === "INACTIF" ? existing.inactif + c : existing.inactif,
      });
    }
    return [...byMonth.values()];
  }

  async getTop5ClientsByLicences(tx?: DbTransaction): Promise<readonly TopClientByLicences[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target.execute<TopClientRow>(sql`
      SELECT
        c.id AS client_id,
        c.code_client,
        c.raison_sociale,
        count(l.id)::text AS licences_count
      FROM lic_clients c
      LEFT JOIN lic_licences l ON l.client_id = c.id
      GROUP BY c.id, c.code_client, c.raison_sociale
      ORDER BY count(l.id) DESC, c.code_client ASC
      LIMIT 5
    `);
    const rows = result as unknown as readonly TopClientRow[];
    return rows.map((r) => ({
      clientId: r.client_id,
      codeClient: r.code_client,
      raisonSociale: r.raison_sociale,
      licencesCount: Number(r.licences_count),
    }));
  }

  async getCurrentMonthVolumes(tx?: DbTransaction): Promise<readonly VolumeAggregate[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    // Top 5 articles tous clients confondus (somme volumes autorisés/consommés
    // sur la dernière période snapshot enregistrée — fallback sur licence_articles
    // courant si pas de snapshot).
    const result = await target.execute<VolumeRow>(sql`
      SELECT
        ar.code AS article_code,
        ar.nom AS article_nom,
        coalesce(sum(la.volume_autorise), 0)::text AS total_autorise,
        coalesce(sum(la.volume_consomme), 0)::text AS total_consomme
      FROM lic_articles_ref ar
      LEFT JOIN lic_licence_articles la ON la.article_id = ar.id
      WHERE ar.actif = true
      GROUP BY ar.code, ar.nom
      HAVING coalesce(sum(la.volume_autorise), 0) > 0
      ORDER BY total_consomme DESC
      LIMIT 5
    `);
    const rows = result as unknown as readonly VolumeRow[];
    return rows.map((r) => {
      const totalAutorise = Number(r.total_autorise);
      const totalConsomme = Number(r.total_consomme);
      const tauxPct = totalAutorise === 0 ? 0 : Math.round((totalConsomme / totalAutorise) * 100);
      return {
        articleCode: r.article_code,
        articleNom: r.article_nom,
        totalAutorise,
        totalConsomme,
        tauxPct,
      };
    });
  }

  async getRecentLicences(tx?: DbTransaction): Promise<readonly RecentLicence[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target.execute<RecentLicenceRow>(sql`
      SELECT l.id, l.reference, l.status, c.code_client, c.raison_sociale, l.updated_at
      FROM lic_licences l
      JOIN lic_clients c ON c.id = l.client_id
      ORDER BY l.updated_at DESC
      LIMIT 5
    `);
    const rows = result as unknown as readonly RecentLicenceRow[];
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      status: r.status,
      clientCode: r.code_client,
      clientRaisonSociale: r.raison_sociale,
      updatedAt: toIso(r.updated_at),
    }));
  }

  async getRecentEnCoursRenouvellements(
    tx?: DbTransaction,
  ): Promise<readonly RecentRenouvellement[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const result = await target.execute<RecentRenouvRow>(sql`
      SELECT r.id, r.licence_id, l.reference AS licence_reference,
        r.nouvelle_date_fin, r.created_at
      FROM lic_renouvellements r
      JOIN lic_licences l ON l.id = r.licence_id
      WHERE r.status = 'EN_COURS'
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    const rows = result as unknown as readonly RecentRenouvRow[];
    return rows.map((r) => ({
      id: r.id,
      licenceId: r.licence_id,
      licenceReference: r.licence_reference,
      nouvelleDateFin: toIso(r.nouvelle_date_fin),
      dateCreation: toIso(r.created_at),
    }));
  }
}
