// ==============================================================================
// LIC v2 — /licences/[id]/articles (Phase 6.F)
// Tab débloquée : produits attachés + articles avec volumes.
// ==============================================================================

import { notFound } from "next/navigation";

import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getLicenceUseCase,
  listArticlesByLicenceUseCase,
  listArticlesUseCase,
  listProduitsByLicenceUseCase,
  listProduitsUseCase,
} from "@/server/composition-root";
import { isAppError } from "@/server/modules/error";

import { ArticlesTab } from "../_components/ArticlesTab";
import type { ArticleClientDTO } from "../_components/articles-types";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceArticlesPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  try {
    await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  const [produits, articles, produitsCatalogue, articlesCatalogue] = await Promise.all([
    listProduitsByLicenceUseCase.execute(id),
    listArticlesByLicenceUseCase.execute(id),
    listProduitsUseCase.execute({ actif: true }),
    listArticlesUseCase.execute({ actif: true }),
  ]);

  const articlesCatalogueByProduit: Record<number, ArticleClientDTO[]> = {};
  for (const a of articlesCatalogue) {
    const list = articlesCatalogueByProduit[a.produitId] ?? [];
    list.push(a);
    articlesCatalogueByProduit[a.produitId] = list;
  }

  return (
    <ArticlesTab
      licenceId={id}
      produits={produits}
      articles={articles}
      produitsCatalogue={produitsCatalogue}
      articlesCatalogueByProduit={articlesCatalogueByProduit}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
