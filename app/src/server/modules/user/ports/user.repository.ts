// ==============================================================================
// LIC v2 — Port UserRepository (F-07)
//
// Contrat d'accès aux users. F-07 ne couvre que ce dont change-password a
// besoin (findById + updatePassword). F-08+ enrichira (search, list, soft
// delete, etc.) sans casser l'interface.
//
// `tx` optionnel : permet au use-case d'inscrire la lecture/écriture dans la
// même transaction que l'audit (règle L3 PROJECT_CONTEXT).
// ==============================================================================

export interface UserRecord {
  readonly id: string;
  readonly email: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly passwordHash: string;
  readonly mustChangePassword: boolean;
  readonly tokenVersion: number;
  readonly role: "SADMIN" | "ADMIN" | "USER";
  readonly actif: boolean;
}

/** Transaction Drizzle (typage opaque, voir audit.recorder pour détail). */
export type DbTransaction = unknown;

export abstract class UserRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<UserRecord | null>;

  /** Update atomique du mot de passe :
   *  - password_hash = newHash
   *  - must_change_password = false
   *  - token_version = token_version + 1 (révocation des sessions actives) */
  abstract updatePassword(id: string, newHash: string, tx?: DbTransaction): Promise<void>;
}
