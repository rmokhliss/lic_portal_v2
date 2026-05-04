// ==============================================================================
// LIC v2 — Composition root du module licence (Phase 5).
// Read-only ici ; mutateurs dans composition-root.ts (audit + user dépendance).
// ==============================================================================

import { LicenceRepositoryPg } from "./adapters/postgres/licence.repository.pg";
import { GetLicenceUseCase } from "./application/get-licence.usecase";
import { ListLicencesByClientUseCase } from "./application/list-licences-by-client.usecase";
import type { LicenceRepository } from "./ports/licence.repository";

export const licenceRepository: LicenceRepository = new LicenceRepositoryPg();

export const getLicenceUseCase = new GetLicenceUseCase(licenceRepository);
export const listLicencesByClientUseCase = new ListLicencesByClientUseCase(licenceRepository);
