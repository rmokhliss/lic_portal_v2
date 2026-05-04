// ==============================================================================
// LIC v2 — GetDashboardStatsUseCase (Phase 11.A)
//
// Read-only, pas d'audit. Agrège tous les fragments du dashboard en un seul
// fetch (parallèle Promise.all pour limiter la latence).
// ==============================================================================

import type {
  DashboardKpis,
  DashboardRepository,
  LicenceStatusByMonthPoint,
  RecentLicence,
  RecentRenouvellement,
  TopClientByLicences,
  VolumeAggregate,
} from "../ports/dashboard.repository";

export interface DashboardStats {
  readonly kpis: DashboardKpis;
  readonly licenceStatusByMonth: readonly LicenceStatusByMonthPoint[];
  readonly topClients: readonly TopClientByLicences[];
  readonly volumes: readonly VolumeAggregate[];
  readonly recentLicences: readonly RecentLicence[];
  readonly recentRenouvellements: readonly RecentRenouvellement[];
}

export interface GetDashboardStatsInput {
  /** Default 6. Fenêtre du graphique status par mois. */
  readonly monthsBack?: number;
}

export class GetDashboardStatsUseCase {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async execute(input: GetDashboardStatsInput = {}): Promise<DashboardStats> {
    const monthsBack = input.monthsBack ?? 6;
    const [kpis, licenceStatusByMonth, topClients, volumes, recentLicences, recentRenouvellements] =
      await Promise.all([
        this.dashboardRepository.getKpis(),
        this.dashboardRepository.getLicenceStatusByMonth(monthsBack),
        this.dashboardRepository.getTop5ClientsByLicences(),
        this.dashboardRepository.getCurrentMonthVolumes(),
        this.dashboardRepository.getRecentLicences(),
        this.dashboardRepository.getRecentEnCoursRenouvellements(),
      ]);
    return {
      kpis,
      licenceStatusByMonth,
      topClients,
      volumes,
      recentLicences,
      recentRenouvellements,
    };
  }
}
