// ==============================================================================
// LIC v2 — /clients/[id]/licences (Phase 5.E + Phase 22 R-46 wizard depuis
//          fiche client)
//
// Server Component : fetch entités + licences + catalogue (produits/articles
// actifs) + client courant. Rend LicencesTab — qui affiche le tableau et
// expose le NewLicenceDialog wizard 3 étapes (Phase 21 R-30) avec
// `lockedClientId` pour figer le client en étape 1.
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  listArticlesUseCase,
  listEntitesByClientUseCase,
  listLicencesByClientUseCase,
  listProduitsUseCase,
} from "@/server/composition-root";

import { LicencesTab } from "../_components/LicencesTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientLicencesPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  let client;
  try {
    client = await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  const [entites, licencesPage, produitsAll, articlesAll] = await Promise.all([
    listEntitesByClientUseCase.execute(id),
    listLicencesByClientUseCase.execute({ clientId: id, limit: 100 }),
    listProduitsUseCase.execute({ actif: true }),
    listArticlesUseCase.execute({ actif: true }),
  ]);

  // Phase 22 R-46 — un seul client (le courant) pour le wizard locked.
  const wizardClients = [
    { id: client.id, codeClient: client.codeClient, raisonSociale: client.raisonSociale },
  ];
  const wizardProduits = produitsAll.map((p) => ({ id: p.id, code: p.code, nom: p.nom }));
  const wizardArticles = articlesAll.map((a) => ({
    id: a.id,
    produitId: a.produitId,
    code: a.code,
    nom: a.nom,
    uniteVolume: a.uniteVolume,
    controleVolume: a.controleVolume,
  }));

  return (
    <LicencesTab
      clientId={id}
      entites={entites}
      licences={licencesPage.items}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
      wizardClients={wizardClients}
      wizardProduits={wizardProduits}
      wizardArticles={wizardArticles}
    />
  );
}
