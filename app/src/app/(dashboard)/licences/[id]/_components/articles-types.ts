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
  readonly volumeAutorise: number;
  readonly volumeConsomme: number;
}

export interface ProduitWithLiaisonDTO {
  readonly liaison: LicenceProduitClientDTO;
  readonly produit: ProduitClientDTO | null;
}

export interface ArticleWithLiaisonDTO {
  readonly liaison: LicenceArticleClientDTO;
  readonly article: ArticleClientDTO | null;
}
