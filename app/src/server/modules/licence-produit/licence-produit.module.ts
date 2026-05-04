// ==============================================================================
// LIC v2 — Composition root du module licence-produit (Phase 6 étape 6.C)
//
// Read-only câblé ici (ListProduitsByLicenceUseCase a besoin du
// produitRepository pour dénormaliser → cross-module read-only autorisé).
// Mutateurs (Add, Remove) câblés dans composition-root.ts (audit obligatoire).
// ==============================================================================

import { produitRepository } from "@/server/modules/produit/produit.module";

import { LicenceProduitRepositoryPg } from "./adapters/postgres/licence-produit.repository.pg";
import { ListProduitsByLicenceUseCase } from "./application/list-produits-by-licence.usecase";
import type { LicenceProduitRepository } from "./ports/licence-produit.repository";

export const licenceProduitRepository: LicenceProduitRepository = new LicenceProduitRepositoryPg();

export const listProduitsByLicenceUseCase = new ListProduitsByLicenceUseCase(
  licenceProduitRepository,
  produitRepository,
);
