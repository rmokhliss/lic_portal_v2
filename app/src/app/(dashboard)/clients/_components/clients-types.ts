// ==============================================================================
// LIC v2 — Types DTO client ré-exposés au Client Component (Phase 4 étape 4.E)
// Cf. R-31 — boundaries app-route → adapters interdit, on duplique les
// interfaces ici, alignées par construction au runtime via le typecheck.
// ==============================================================================

export type ClientStatutClient = "PROSPECT" | "ACTIF" | "SUSPENDU" | "RESILIE";

export interface ClientDTO {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact: string | null;
  readonly emailContact: string | null;
  readonly telContact: string | null;
  readonly codePays: string | null;
  readonly codeDevise: string | null;
  readonly codeLangue: string | null;
  readonly salesResponsable: string | null;
  readonly accountManager: string | null;
  readonly statutClient: ClientStatutClient;
  readonly dateSignatureContrat: string | null;
  readonly dateMiseEnProd: string | null;
  readonly dateDemarrageSupport: string | null;
  readonly prochaineDateRenouvellementSupport: string | null;
  readonly actif: boolean;
  readonly version: number;
  readonly dateCreation: string;
}
