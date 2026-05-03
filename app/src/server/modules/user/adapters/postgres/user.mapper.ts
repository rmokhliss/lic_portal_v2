// ==============================================================================
// LIC v2 — Mapper User (Phase 2.B.bis EC-08)
//
// Conversions :
//   - rowToEntity(row)   : row Drizzle → PersistedUser (entité EC-08)
//   - rowToRecord(row)   : row Drizzle → UserRecord (legacy F-07/F-08)
//   - toDTO(entity)      : PersistedUser → UserDTO (JSON-serializable côté UI)
//
// Note : le row Drizzle `select()` complet contient passwordHash. rowToEntity
// l'IGNORE volontairement (l'entité ne porte pas le hash, principe DDD).
// rowToRecord le conserve (legacy change-password l'utilise pour bcrypt.compare).
// ==============================================================================

import type { PersistedUser } from "../../domain/user.entity";
import { User, type UserRole } from "../../domain/user.entity";
import type { UserRecord } from "../../ports/user.repository";

import type { users as usersTable } from "./schema";

type UserRow = typeof usersTable.$inferSelect;

export interface UserDTO {
  readonly id: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string;
  readonly role: UserRole;
  readonly telephone: string | null;
  readonly mustChangePassword: boolean;
  readonly actif: boolean;
  readonly dateCreation: string;
  /** Pré-calculé pour la table UI (règle L9). */
  readonly display: string;
}

export function rowToEntity(row: UserRow): PersistedUser {
  return User.rehydrate({
    id: row.id,
    matricule: row.matricule,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: row.role,
    telephone: row.telephone,
    mustChangePassword: row.mustChangePassword,
    actif: row.actif,
    dateCreation: row.createdAt,
  });
}

export function rowToRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    matricule: row.matricule,
    nom: row.nom,
    prenom: row.prenom,
    passwordHash: row.passwordHash,
    mustChangePassword: row.mustChangePassword,
    tokenVersion: row.tokenVersion,
    role: row.role,
    actif: row.actif,
  };
}

export function toDTO(entity: PersistedUser): UserDTO {
  return {
    id: entity.id,
    matricule: entity.matricule,
    nom: entity.nom,
    prenom: entity.prenom,
    email: entity.email,
    role: entity.role,
    telephone: entity.telephone,
    mustChangePassword: entity.mustChangePassword,
    actif: entity.actif,
    dateCreation: entity.dateCreation.toISOString(),
    display: entity.toDisplay(),
  };
}
