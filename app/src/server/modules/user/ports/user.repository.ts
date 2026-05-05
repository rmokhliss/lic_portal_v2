// ==============================================================================
// LIC v2 — Port UserRepository (F-07 + extension EC-08 Phase 2.B.bis)
//
// Deux surfaces parallèles :
//
//   Legacy F-07/F-08 (consommée par change-password.usecase.ts — intouché Q3) :
//     - findById(id, tx?)         → UserRecord | null  (interface plate)
//     - updatePassword(id, hash, tx?) → pose must_change_password=FALSE
//
//   EC-08 Phase 2.B.bis (consommée par les 4 nouveaux use-cases) :
//     - findByIdEntity(id, tx?)   → PersistedUser | null
//     - findAll(opts?, tx?)
//     - findByMatricule(m, tx?)
//     - findByEmail(e, tx?)
//     - save(user, hash, tx?)     → INSERT (must_change_password=TRUE forcé)
//     - updateProfile(persisted, tx?) → UPDATE nom/prenom/role
//     - updateActif(id, actif, tx?)
//     - resetPassword(id, hash, tx?) → pose must_change_password=TRUE +
//                                     bump tokenVersion (révocation sessions)
//
// `tx` optionnel : permet aux use-cases EC-08 d'inscrire la lecture/écriture
// dans la même transaction que l'audit (règle L3 PROJECT_CONTEXT).
// ==============================================================================

import type { PersistedUser, User, UserRole } from "../domain/user.entity";

export interface UserRecord {
  readonly id: string;
  readonly email: string;
  readonly matricule: string;
  readonly nom: string;
  readonly prenom: string;
  readonly passwordHash: string;
  readonly mustChangePassword: boolean;
  readonly tokenVersion: number;
  readonly role: UserRole;
  readonly actif: boolean;
}

/** Transaction Drizzle (typage opaque, voir audit.recorder pour détail). */
export type DbTransaction = unknown;

export interface FindAllUsersOptions {
  readonly actif?: boolean;
}

export abstract class UserRepository {
  // --- Legacy F-07 (change-password) --------------------------------------

  abstract findById(id: string, tx?: DbTransaction): Promise<UserRecord | null>;

  /** Update mot de passe initié par l'user lui-même : pose
   *  must_change_password = FALSE + bump token_version. */
  abstract updatePassword(id: string, newHash: string, tx?: DbTransaction): Promise<void>;

  // --- EC-08 (nouveaux use-cases) -----------------------------------------

  abstract findByIdEntity(id: string, tx?: DbTransaction): Promise<PersistedUser | null>;

  abstract findAll(
    opts?: FindAllUsersOptions,
    tx?: DbTransaction,
  ): Promise<readonly PersistedUser[]>;

  abstract findByMatricule(matricule: string, tx?: DbTransaction): Promise<PersistedUser | null>;

  abstract findByEmail(email: string, tx?: DbTransaction): Promise<PersistedUser | null>;

  /** INSERT. Pose must_change_password=TRUE (création admin → user doit le
   *  changer au premier login). Retourne PersistedUser avec id + dateCreation
   *  BD-générés. */
  abstract save(user: User, passwordHash: string, tx?: DbTransaction): Promise<PersistedUser>;

  /** UPDATE nom + prenom + role. Email + matricule immuables (cf. EC-08). */
  abstract updateProfile(user: PersistedUser, tx?: DbTransaction): Promise<void>;

  /** UPDATE actif boolean. */
  abstract updateActif(id: string, actif: boolean, tx?: DbTransaction): Promise<void>;

  /** Reset par admin : pose must_change_password=TRUE + bump token_version
   *  (révoque les sessions actives). Distinct d'updatePassword (qui pose
   *  must_change_password=FALSE pour le change-password user-initié). */
  abstract resetPassword(id: string, newHash: string, tx?: DbTransaction): Promise<void>;

  // --- Phase 15 — brute-force lockout (audit Master C1) ---------------------

  /** Lit le couple (failed_login_count, last_failed_login_at) pour évaluer
   *  le lockout. Retourne null si l'utilisateur n'existe pas. */
  abstract findLoginCounters(
    id: string,
    tx?: DbTransaction,
  ): Promise<{ failedLoginCount: number; lastFailedLoginAt: Date | null } | null>;

  /** Sur échec login : incrémente compteur + horodatage. */
  abstract recordLoginFailure(
    id: string,
    newCount: number,
    failedAt: Date,
    tx?: DbTransaction,
  ): Promise<void>;

  /** Sur succès login : reset compteur + horodatage à NULL. */
  abstract resetLoginCounters(id: string, tx?: DbTransaction): Promise<void>;
}
