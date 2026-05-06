// ==============================================================================
// LIC v2 — Entité Article (Phase 6 étape 6.B + Phase 19 R-13 controleVolume)
//
// Référentiel paramétrable SADMIN. Pattern strict aligné sur Produit.
// Identifiant business stable = (produitId, code) → unicité par produit.
//
// Phase 19 R-13 — `controleVolume` (default true) : si false, l'article est
// une "fonctionnalité" (ATM-ADV, POS-ADV…) et le volume autorisé n'est pas
// demandé à la création licence-article. Flag UI/routage — pas de validation.
//
// Codes : SPX-LIC-748 validation, 746 NotFound, 747 conflict.
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const CODE_REGEX = /^[A-Z][A-Z0-9_-]*$/;
const CODE_MAX_LEN = 30;
const NOM_MAX_LEN = 200;
const DESC_MAX_LEN = 1000;
const UNITE_MAX_LEN = 30;

export interface CreateArticleInput {
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly uniteVolume?: string;
  readonly actif?: boolean;
  readonly controleVolume?: boolean;
}

export interface RehydrateArticleProps {
  readonly id: number;
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly uniteVolume: string;
  readonly actif: boolean;
  readonly controleVolume: boolean;
}

interface ArticleProps {
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly uniteVolume: string;
  readonly actif: boolean;
  readonly controleVolume: boolean;
}

export class Article {
  readonly produitId: number;
  readonly code: string;
  readonly nom: string;
  readonly description?: string;
  readonly uniteVolume: string;
  readonly actif: boolean;
  readonly controleVolume: boolean;

  protected constructor(props: ArticleProps) {
    this.produitId = props.produitId;
    this.code = props.code;
    this.nom = props.nom;
    this.description = props.description;
    this.uniteVolume = props.uniteVolume;
    this.actif = props.actif;
    this.controleVolume = props.controleVolume;
  }

  static create(input: CreateArticleInput): Article {
    Article.validateProduitId(input.produitId);
    Article.validateCode(input.code);
    Article.validateNom(input.nom);
    if (input.description !== undefined) Article.validateDescription(input.description);
    const unite = input.uniteVolume ?? "transactions";
    Article.validateUniteVolume(unite);
    return new Article({
      produitId: input.produitId,
      code: input.code,
      nom: input.nom,
      description: input.description,
      uniteVolume: unite,
      actif: input.actif ?? true,
      controleVolume: input.controleVolume ?? true,
    });
  }

  static rehydrate(props: RehydrateArticleProps): PersistedArticle {
    return new PersistedArticle(
      {
        produitId: props.produitId,
        code: props.code,
        nom: props.nom,
        description: props.description,
        uniteVolume: props.uniteVolume,
        actif: props.actif,
        controleVolume: props.controleVolume,
      },
      props.id,
    );
  }

  toAuditSnapshot(): Record<string, unknown> {
    return {
      produitId: this.produitId,
      code: this.code,
      nom: this.nom,
      description: this.description ?? null,
      uniteVolume: this.uniteVolume,
      actif: this.actif,
      controleVolume: this.controleVolume,
    };
  }

  static validateProduitId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: "produitId doit être un entier > 0",
      });
    }
  }

  static validateCode(code: string): void {
    if (typeof code !== "string" || code.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: "code article obligatoire (non vide)",
      });
    }
    if (code.length > CODE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: `code article > ${String(CODE_MAX_LEN)} caractères`,
      });
    }
    if (!CODE_REGEX.test(code)) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: `code article "${code}" doit matcher /^[A-Z][A-Z0-9_-]*$/`,
      });
    }
  }

  static validateNom(nom: string): void {
    if (typeof nom !== "string" || nom.length === 0) {
      throw new ValidationError({ code: "SPX-LIC-748", message: "nom obligatoire (non vide)" });
    }
    if (nom.length > NOM_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: `nom > ${String(NOM_MAX_LEN)} caractères`,
      });
    }
  }

  static validateDescription(desc: string): void {
    if (desc === "") {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: "description doit être absente ou non-vide",
      });
    }
    if (desc.length > DESC_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: `description > ${String(DESC_MAX_LEN)} caractères`,
      });
    }
  }

  static validateUniteVolume(unite: string): void {
    if (typeof unite !== "string" || unite.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: "uniteVolume obligatoire (non vide)",
      });
    }
    if (unite.length > UNITE_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-748",
        message: `uniteVolume > ${String(UNITE_MAX_LEN)} caractères`,
      });
    }
  }
}

export class PersistedArticle extends Article {
  readonly id: number;

  constructor(props: ArticleProps, id: number) {
    super(props);
    this.id = id;
  }

  withName(nom: string): PersistedArticle {
    Article.validateNom(nom);
    return new PersistedArticle({ ...this.snapshot(), nom }, this.id);
  }

  withDescription(description: string | null | undefined): PersistedArticle {
    if (description !== null && description !== undefined) Article.validateDescription(description);
    return new PersistedArticle(
      { ...this.snapshot(), description: description ?? undefined },
      this.id,
    );
  }

  withUniteVolume(uniteVolume: string): PersistedArticle {
    Article.validateUniteVolume(uniteVolume);
    return new PersistedArticle({ ...this.snapshot(), uniteVolume }, this.id);
  }

  withControleVolume(controleVolume: boolean): PersistedArticle {
    return new PersistedArticle({ ...this.snapshot(), controleVolume }, this.id);
  }

  toggle(): PersistedArticle {
    return new PersistedArticle({ ...this.snapshot(), actif: !this.actif }, this.id);
  }

  private snapshot(): ArticleProps {
    return {
      produitId: this.produitId,
      code: this.code,
      nom: this.nom,
      description: this.description,
      uniteVolume: this.uniteVolume,
      actif: this.actif,
      controleVolume: this.controleVolume,
    };
  }

  override toAuditSnapshot(): Record<string, unknown> {
    return { id: this.id, ...super.toAuditSnapshot() };
  }
}
