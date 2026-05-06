// ==============================================================================
// LIC v2 — Types DTO settings catalogues (Phase 6.F, R-31)
// ==============================================================================

export interface ProduitClientDTO {
  readonly id: number;
  readonly code: string;
  readonly nom: string;
  readonly description: string | null;
  readonly actif: boolean;
}

export interface ArticleClientDTO {
  readonly id: number;
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description: string | null;
  readonly uniteVolume: string;
  readonly actif: boolean;
  /** Phase 19 R-13 — true = volume contrôlé (default). false = illimité. */
  readonly controleVolume: boolean;
}
