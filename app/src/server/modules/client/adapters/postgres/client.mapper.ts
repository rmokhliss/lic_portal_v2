// ==============================================================================
// LIC v2 — Mapper Client (Phase 4 étape 4.B)
// ==============================================================================

import type { PersistedClient } from "../../domain/client.entity";
import { Client, type ClientStatut } from "../../domain/client.entity";

import type { clients as clientsTable } from "./schema";

type ClientRow = typeof clientsTable.$inferSelect;

export interface ClientDTO {
  readonly id: string;
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly nomContact: string | null;
  readonly emailContact: string | null;
  readonly telContact: string | null;
  readonly codePays: string | null;
  readonly codeDevise: string | null;
  readonly codeLangue: string | null;
  readonly salesResponsable: string | null;
  readonly accountManager: string | null;
  readonly statutClient: ClientStatut;
  readonly dateSignatureContrat: string | null;
  readonly dateMiseEnProd: string | null;
  readonly dateDemarrageSupport: string | null;
  readonly prochaineDateRenouvellementSupport: string | null;
  readonly actif: boolean;
  readonly version: number;
  readonly dateCreation: string;
}

export function rowToEntity(row: ClientRow): PersistedClient {
  return Client.rehydrate({
    id: row.id,
    codeClient: row.codeClient,
    raisonSociale: row.raisonSociale,
    nomContact: row.nomContact,
    emailContact: row.emailContact,
    telContact: row.telContact,
    codePays: row.codePays,
    codeDevise: row.codeDevise,
    codeLangue: row.codeLangue,
    salesResponsable: row.salesResponsable,
    accountManager: row.accountManager,
    statutClient: row.statutClient,
    dateSignatureContrat: row.dateSignatureContrat,
    dateMiseEnProd: row.dateMiseEnProd,
    dateDemarrageSupport: row.dateDemarrageSupport,
    prochaineDateRenouvellementSupport: row.prochaineDateRenouvellementSupport,
    actif: row.actif,
    version: row.version,
    dateCreation: row.createdAt,
  });
}

export function toDTO(entity: PersistedClient): ClientDTO {
  return {
    id: entity.id,
    codeClient: entity.codeClient,
    raisonSociale: entity.raisonSociale,
    nomContact: entity.nomContact,
    emailContact: entity.emailContact,
    telContact: entity.telContact,
    codePays: entity.codePays,
    codeDevise: entity.codeDevise,
    codeLangue: entity.codeLangue,
    salesResponsable: entity.salesResponsable,
    accountManager: entity.accountManager,
    statutClient: entity.statutClient,
    dateSignatureContrat: entity.dateSignatureContrat,
    dateMiseEnProd: entity.dateMiseEnProd,
    dateDemarrageSupport: entity.dateDemarrageSupport,
    prochaineDateRenouvellementSupport: entity.prochaineDateRenouvellementSupport,
    actif: entity.actif,
    version: entity.version,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
