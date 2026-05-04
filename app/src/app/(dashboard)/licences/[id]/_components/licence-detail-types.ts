// ==============================================================================
// LIC v2 — Types DTO licence + renouvellement (Phase 5.F, R-31)
// ==============================================================================

export type LicenceStatusClient = "ACTIF" | "INACTIF" | "SUSPENDU" | "EXPIRE";
export type RenewStatusClient = "EN_COURS" | "VALIDE" | "CREE" | "ANNULE";

export interface LicenceDTO {
  readonly id: string;
  readonly reference: string;
  readonly clientId: string;
  readonly entiteId: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly status: LicenceStatusClient;
  readonly commentaire: string | null;
  readonly version: number;
  readonly renouvellementAuto: boolean;
  readonly notifEnvoyee: boolean;
  readonly dateCreation: string;
}

export interface RenouvellementDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly nouvelleDateDebut: string;
  readonly nouvelleDateFin: string;
  readonly status: RenewStatusClient;
  readonly commentaire: string | null;
  readonly valideePar: string | null;
  readonly dateValidation: string | null;
  readonly dateCreation: string;
}
