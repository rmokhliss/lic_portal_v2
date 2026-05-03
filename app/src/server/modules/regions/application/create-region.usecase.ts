// ==============================================================================
// LIC v2 — CreateRegionUseCase (Phase 2.B étape 2/7)
//
// Orchestration :
//   1. Region.create(input) — validation invariants → throw SPX-LIC-702
//   2. findByCode(regionCode) — vérifier l'unicité du code
//      → throw ConflictError SPX-LIC-701 si déjà existant
//   3. save(region) — INSERT, retourne PersistedRegion (id+date BD)
//
// Pas d'audit (cf. ADR 0017 + Stop arbitrage étape 2 + R-27 référentiel
// feedback) : les 6 référentiels paramétrables sont exclus de la règle
// "audit obligatoire" §4.2 — PK serial incompatible avec
// lic_audit_log.entity_id uuid, traçabilité implicite via dateCreation.
//
// Pas de db.transaction() interne : sans audit, la cohérence transactionnelle
// est fournie par la contrainte UNIQUE BD seule. La fenêtre de race entre
// findByCode et save (rare pour SADMIN mono-utilisateur, refs <200 lignes)
// produit dans le pire cas une erreur Postgres unique_violation propagée
// telle quelle — acceptable pour l'usage cible.
// ==============================================================================

import { toDTO, type RegionDTO } from "../adapters/postgres/region.mapper";
import { Region, type CreateRegionInput as DomainCreateInput } from "../domain/region.entity";
import { regionCodeAlreadyExists } from "../domain/region.errors";
import type { RegionRepository } from "../ports/region.repository";

export type CreateRegionUseCaseInput = DomainCreateInput;

export class CreateRegionUseCase {
  constructor(private readonly regionRepository: RegionRepository) {}

  async execute(input: CreateRegionUseCaseInput): Promise<RegionDTO> {
    const region = Region.create(input);

    const existing = await this.regionRepository.findByCode(region.regionCode);
    if (existing !== null) {
      throw regionCodeAlreadyExists(region.regionCode);
    }

    const persisted = await this.regionRepository.save(region);
    return toDTO(persisted);
  }
}
