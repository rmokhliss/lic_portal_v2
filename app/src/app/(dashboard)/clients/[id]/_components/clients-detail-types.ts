// ==============================================================================
// LIC v2 — Types DTO entite/contact ré-exposés au Client Component (4.F)
// Cf. R-31 — boundaries app-route → adapters interdit, on duplique les
// interfaces ici, alignées par construction au runtime via le typecheck.
// ==============================================================================

export interface EntiteDTO {
  readonly id: string;
  readonly clientId: string;
  readonly nom: string;
  readonly codePays: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export interface ContactDTO {
  readonly id: string;
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}
