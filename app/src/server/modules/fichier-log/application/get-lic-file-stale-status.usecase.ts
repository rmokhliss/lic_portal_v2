// ==============================================================================
// LIC v2 — GetLicFileStaleStatusUseCase (Phase 23)
//
// Read-only. Compare le hash courant du contenu produit/article/volume d'une
// licence avec le hash stocké au moment de la dernière génération .lic. Retourne
// un statut explicite pour la bannière UI :
//   - never  : aucun .lic généré pour cette licence
//   - fresh  : .lic généré et contenu inchangé depuis
//   - stale  : .lic généré MAIS contenu modifié depuis (re-génération nécessaire)
//
// Pas de side-effect, pas de tx, pas d'audit. Appelé en lecture par les Server
// Components fiche licence (resume + articles).
// ==============================================================================

import { sql } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";

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

interface LicenceHashRow extends Record<string, unknown> {
  readonly last_lic_file_hash: string | null;
  readonly last_lic_file_generated_at: Date | null;
}

export class GetLicFileStaleStatusUseCase {
  async execute(licenceId: string): Promise<LicFileStaleStatus> {
    const rowsRes = await db.execute<LicenceHashRow>(sql`
      SELECT last_lic_file_hash, last_lic_file_generated_at
      FROM lic_licences WHERE id = ${licenceId}
    `);
    const rows = rowsRes as unknown as readonly LicenceHashRow[];
    const row = rows[0];

    const currentHash = await computeLicenceContentHash(licenceId);

    const storedHash = row?.last_lic_file_hash ?? null;
    const generatedAtDate = row?.last_lic_file_generated_at ?? null;
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
