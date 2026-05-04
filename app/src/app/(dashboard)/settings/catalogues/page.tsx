// ==============================================================================
// LIC v2 — /settings/catalogues (Phase 6.F)
// Page débloquée : gestion catalogue produits + articles SADMIN.
// ==============================================================================

import { listArticlesUseCase, listProduitsUseCase } from "@/server/composition-root";

import { CataloguesPanel } from "./_components/CataloguesPanel";

export default async function SettingsCataloguesPage() {
  const [produits, articles] = await Promise.all([
    listProduitsUseCase.execute(),
    listArticlesUseCase.execute(),
  ]);

  return <CataloguesPanel produits={produits} articles={articles} />;
}
