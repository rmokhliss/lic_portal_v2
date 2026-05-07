// ==============================================================================
// LIC v2 — Types DTO Phase 6.F articles (R-31 dupliqués côté Client Component)
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

export interface LicenceProduitClientDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly produitId: number;
  readonly dateAjout: string;
}

export interface LicenceArticleClientDTO {
  readonly id: string;
  readonly licenceId: string;
  readonly articleId: number;
  /** null = volume non défini (équivalent illimité métier — Phase 23). */
  readonly volumeAutorise: number | null;
  readonly volumeConsomme: number | null;
}

export interface ProduitWithLiaisonDTO {
  readonly liaison: LicenceProduitClientDTO;
  readonly produit: ProduitClientDTO | null;
}

export interface ArticleWithLiaisonDTO {
  readonly liaison: LicenceArticleClientDTO;
  readonly article: ArticleClientDTO | null;
}
