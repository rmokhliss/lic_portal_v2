// ==============================================================================
// LIC v2 — Port DashboardRepository (Phase 11.A)
// Lecture seule, agrégats SQL pour le dashboard EC-01. Pas d'audit.
// ==============================================================================

export type DbTransaction = unknown;

export interface DashboardKpis {
  readonly clientsActifs: number;
  readonly licencesActives: number;
  readonly licencesExpirees: number;
  readonly licencesSuspendues: number;
  readonly renouvellementsEnCours: number;
}

export interface LicenceStatusByMonthPoint {
  readonly month: string; // "YYYY-MM"
  readonly actif: number;
  readonly expire: number;
  readonly suspendu: number;
  readonly inactif: number;
}

export interface TopClientByLicences {
  readonly clientId: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly licencesCount: number;
}

export interface VolumeAggregate {
  readonly articleCode: string;
  readonly articleNom: string;
  readonly totalAutorise: number;
  readonly totalConsomme: number;
  readonly tauxPct: number;
}

export interface RecentLicence {
  readonly id: string;
  readonly reference: string;
  readonly status: string;
  readonly clientCode: string;
  readonly clientRaisonSociale: string;
  readonly updatedAt: string;
}

export interface RecentRenouvellement {
  readonly id: string;
  readonly licenceId: string;
  readonly licenceReference: string;
  readonly nouvelleDateFin: string;
  readonly dateCreation: string;
}

export abstract class DashboardRepository {
  abstract getKpis(tx?: DbTransaction): Promise<DashboardKpis>;
  abstract getLicenceStatusByMonth(
    monthsBack: number,
    tx?: DbTransaction,
  ): Promise<readonly LicenceStatusByMonthPoint[]>;
  abstract getTop5ClientsByLicences(tx?: DbTransaction): Promise<readonly TopClientByLicences[]>;
  abstract getCurrentMonthVolumes(tx?: DbTransaction): Promise<readonly VolumeAggregate[]>;
  abstract getRecentLicences(tx?: DbTransaction): Promise<readonly RecentLicence[]>;
  abstract getRecentEnCoursRenouvellements(
    tx?: DbTransaction,
  ): Promise<readonly RecentRenouvellement[]>;
}
