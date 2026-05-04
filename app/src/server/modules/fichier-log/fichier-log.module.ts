// ==============================================================================
// LIC v2 — Composition root fichier-log (Phase 10.B + 10.C)
// Pas d'audit (DEC-019). Read-only + log singletons câblés ici. Le use-case
// generate-licence-fichier (Phase 10.C) est cross-module → câblage dans
// composition-root.ts global.
// ==============================================================================

import { FichierLogRepositoryPg } from "./adapters/postgres/fichier-log.repository.pg";
import { ListFichiersByLicenceUseCase } from "./application/list-fichiers-by-licence.usecase";
import { LogFichierGenereUseCase } from "./application/log-fichier-genere.usecase";
import { LogHealthcheckImporteUseCase } from "./application/log-healthcheck-importe.usecase";
import type { FichierLogRepository } from "./ports/fichier-log.repository";

export const fichierLogRepository: FichierLogRepository = new FichierLogRepositoryPg();

export const listFichiersByLicenceUseCase = new ListFichiersByLicenceUseCase(fichierLogRepository);
export const logFichierGenereUseCase = new LogFichierGenereUseCase(fichierLogRepository);
export const logHealthcheckImporteUseCase = new LogHealthcheckImporteUseCase(fichierLogRepository);
