// ==============================================================================
// LIC v2 — GetLicFileStaleStatusUseCase (Phase 23 + Phase 24)
//
// Read-only. Compare le hash courant du contenu produit/article/volume d'une
// licence avec le hash stocké au moment de la dernière génération .lic. Retourne
// un statut explicite pour la bannière UI :
//   - never  : aucun .lic généré pour cette licence
//   - fresh  : .lic généré et contenu inchangé depuis
//   - stale  : .lic généré MAIS contenu modifié depuis (re-génération nécessaire)
//
// Pas de side-effect, pas de tx, pas d'audit. Appelé en lecture par les Server
// Components fiche licence (resume + articles) + cross-list /licences.
//
// Phase 24 — switch sur Drizzle typed query builder pour le binding UUID
// (cf. compute-licence-content-hash) — raw sql template binding incohérent.
// ==============================================================================

import { eq } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { licences } from "@/server/modules/licence/adapters/postgres/schema";

import { computeLicenceContentHash } from "./__shared/compute-licence-content-hash";

export type LicFileStaleStatus =
  | { readonly status: "never"; readonly currentHash: string }
  | {
      readonly status: "fresh";
      readonly currentHash: string;
      readonly storedHash: string;
      readonly generatedAt: string;
    }
  | {
      readonly status: "stale";
      readonly currentHash: string;
      readonly storedHash: string;
      readonly generatedAt: string;
    };

export class GetLicFileStaleStatusUseCase {
  async execute(licenceId: string): Promise<LicFileStaleStatus> {
    const rows = await db
      .select({
        lastLicFileHash: licences.lastLicFileHash,
        lastLicFileGeneratedAt: licences.lastLicFileGeneratedAt,
      })
      .from(licences)
      .where(eq(licences.id, licenceId))
      .limit(1);

    const currentHash = await computeLicenceContentHash(licenceId);

    const row = rows[0];
    const storedHash = row?.lastLicFileHash ?? null;
    const generatedAtDate = row?.lastLicFileGeneratedAt ?? null;
    if (storedHash === null || generatedAtDate === null) {
      return { status: "never", currentHash };
    }
    const generatedAt = generatedAtDate.toISOString();

    if (currentHash === storedHash) {
      return { status: "fresh", currentHash, storedHash, generatedAt };
    }
    return { status: "stale", currentHash, storedHash, generatedAt };
  }
}
