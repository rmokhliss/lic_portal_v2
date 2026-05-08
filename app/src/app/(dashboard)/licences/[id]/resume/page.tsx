// ==============================================================================
// LIC v2 — /licences/[id]/resume (Phase 5.F)
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  getEntiteUseCase,
  getLicenceUseCase,
  getLicFileStaleStatusUseCase,
  listArticlesByLicenceUseCase,
  listFichiersByLicenceUseCase,
} from "@/server/composition-root";

import { LicenceResumeTab } from "../_components/LicenceResumeTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceResumePage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  let licence;
  try {
    licence = await getLicenceUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-735") notFound();
    throw err;
  }

  // Phase 22 R-49 — comptage articles côté serveur pour piloter l'état
  // « disabled » du bouton "Générer .lic" (évite le pattern click → erreur
  // pour les licences sans aucun article attaché). Le humanizeError côté
  // client gère déjà les cas CA absente / cert manquant (Phase 20 R-31).
  const [client, entite, articles, licFileStatus, fichiers] = await Promise.all([
    getClientUseCase.execute(licence.clientId).catch(() => null),
    getEntiteUseCase.execute(licence.entiteId).catch(() => null),
    listArticlesByLicenceUseCase.execute(id).catch(() => [] as readonly unknown[]),
    // Phase 23 — statut fichier .lic (never/fresh/stale) pour banniere UI.
    getLicFileStaleStatusUseCase.execute(id).catch(() => null),
    // Phase 24 — historique fichiers (pour panneau "Dernier import healthcheck").
    listFichiersByLicenceUseCase.execute(id).catch(() => [] as readonly unknown[]),
  ]);

  // Phase 24 — extrait le dernier import .hc (statut IMPORTED ou ERREUR avec
  // métadonnées) — fichiers déjà ordonnés DESC par createdAt côté repo.
  interface FichierLogLite {
    readonly type: "LIC_GENERATED" | "HEALTHCHECK_IMPORTED";
    readonly statut: "GENERATED" | "IMPORTED" | "ERREUR";
    readonly createdAt: string;
    readonly creePar: string | null;
    readonly metadata: Record<string, unknown> | null;
    readonly errorMessage: string | null;
  }
  const lastHealthcheck =
    (fichiers as readonly FichierLogLite[]).find((f) => f.type === "HEALTHCHECK_IMPORTED") ?? null;

  return (
    <LicenceResumeTab
      licence={licence}
      clientLabel={
        client !== null ? `${client.codeClient} — ${client.raisonSociale}` : licence.clientId
      }
      entiteLabel={entite !== null ? entite.nom : licence.entiteId}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
      // Generation .lic + import .hc reserves SADMIN : ADMIN peut creer un
      // client/licence mais pas emettre les fichiers signes (workflow PKI).
      canGenerateFile={user.role === "SADMIN"}
      articlesCount={articles.length}
      licFileStatus={licFileStatus}
      lastHealthcheck={lastHealthcheck}
    />
  );
}
