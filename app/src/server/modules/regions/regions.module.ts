// ==============================================================================
// LIC v2 — Composition root du module regions (Phase 2.B étape 2/7)
//
// DI manuelle intra-module. Singletons exposés :
//
//   - regionRepository       : surface technique pour cross-module wiring
//                              (ex: composition-root.ts si un futur module
//                              métier doit lire les régions au sein d'une
//                              transaction commune).
//   - listRegionsUseCase     : read-only, lister
//   - getRegionUseCase       : read-only, lookup unitaire
//   - createRegionUseCase    : mutation, INSERT
//   - updateRegionUseCase    : mutation, UPDATE (nom + dmResponsable)
//   - toggleRegionUseCase    : mutation, soft-disable
//
// Aucun audit cross-module (cf. ADR 0017 + R-27 — référentiels paramétrables
// exclus de l'audit obligatoire). Les 5 use-cases sont câblés ici directement,
// pas besoin de composition-root.ts. Pattern à répliquer pour les 4 référentiels
// suivants (étape 3).
//
// Les tests d'intégration construisent leurs propres instances de RegionRepositoryPg
// avec `ctx.db` (DI optionnelle de l'adapter) pour participer au BEGIN/ROLLBACK
// transactionnel via setupTransactionalTests. Les use-cases n'ouvrent pas de
// db.transaction() interne (cf. R-28) — l'isolation est garantie tant que le
// repo opère sur la connexion ctx.sql sous-jacente.
// ==============================================================================

import { RegionRepositoryPg } from "./adapters/postgres/region.repository.pg";
import { CreateRegionUseCase } from "./application/create-region.usecase";
import { GetRegionUseCase } from "./application/get-region.usecase";
import { ListRegionsUseCase } from "./application/list-regions.usecase";
import { ToggleRegionUseCase } from "./application/toggle-region.usecase";
import { UpdateRegionUseCase } from "./application/update-region.usecase";
import type { RegionRepository } from "./ports/region.repository";

export const regionRepository: RegionRepository = new RegionRepositoryPg();

export const listRegionsUseCase = new ListRegionsUseCase(regionRepository);
export const getRegionUseCase = new GetRegionUseCase(regionRepository);
export const createRegionUseCase = new CreateRegionUseCase(regionRepository);
export const updateRegionUseCase = new UpdateRegionUseCase(regionRepository);
export const toggleRegionUseCase = new ToggleRegionUseCase(regionRepository);
