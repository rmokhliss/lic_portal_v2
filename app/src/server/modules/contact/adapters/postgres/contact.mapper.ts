// ==============================================================================
// LIC v2 — Mapper Contact (Phase 4 étape 4.C)
// ==============================================================================

import type { PersistedContact } from "../../domain/contact.entity";
import { Contact } from "../../domain/contact.entity";

import type { contactsClients as contactsTable } from "./schema";

type ContactRow = typeof contactsTable.$inferSelect;

export interface ContactDTO {
  readonly id: string;
  readonly entiteId: string;
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string | null;
  readonly email: string | null;
  readonly telephone: string | null;
  readonly actif: boolean;
  readonly dateCreation: string;
}

export function rowToEntity(row: ContactRow): PersistedContact {
  return Contact.rehydrate({
    id: row.id,
    entiteId: row.entiteId,
    typeContactCode: row.typeContactCode,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    telephone: row.telephone,
    actif: row.actif,
    dateCreation: row.createdAt,
  });
}

export function toDTO(entity: PersistedContact): ContactDTO {
  return {
    id: entity.id,
    entiteId: entity.entiteId,
    typeContactCode: entity.typeContactCode,
    nom: entity.nom,
    prenom: entity.prenom,
    email: entity.email,
    telephone: entity.telephone,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
  };
}
