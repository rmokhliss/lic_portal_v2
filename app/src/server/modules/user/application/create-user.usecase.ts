// ==============================================================================
// LIC v2 — CreateUserUseCase (Phase 2.B.bis EC-08)
//
// Orchestration transactionnelle (règle L3 — audit dans la même tx) :
//   1. User.create(input) → throw SPX-LIC-722 si validation
//   2. db.transaction:
//      a. findByMatricule(input.matricule) → throw SPX-LIC-721 si existe
//      b. findByEmail(input.email)         → throw SPX-LIC-721 si existe
//      c. generatePassword() → bcrypt.hash(cost=10)
//      d. save(user, passwordHash) → PersistedUser (must_change_password=TRUE)
//      e. findByIdEntity(actorId) → format L9 → audit USER_CREATED
//
// Pas de passwordHash dans l'audit (sécurité). afterData = snapshot user
// sans mdp + mustChangePassword=true.
//
// Retourne { user, generatedPassword } — le caller (Server Action) log Pino
// `user_password_to_communicate` puis renvoie la valeur au client UI pour
// affichage UNIQUE dans PasswordRevealDialog.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";

import { toDTO, type UserDTO } from "../adapters/postgres/user.mapper";
import { generatePassword } from "../domain/password";
import { type CreateUserInput, User } from "../domain/user.entity";
import { emailAlreadyExists, matriculeAlreadyExists } from "../domain/user.errors";
import type { PasswordHasher } from "../ports/password-hasher";
import type { UserRepository } from "../ports/user.repository";

export type CreateUserUseCaseInput = CreateUserInput;

export interface CreateUserUseCaseOutput {
  readonly user: UserDTO;
  readonly generatedPassword: string;
}

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
    /** Phase 15 — port PasswordHasher (audit Master 5.1). */
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserUseCaseInput, actorId: string): Promise<CreateUserUseCaseOutput> {
    // Validation domaine en amont — pas de tx ouverte si l'input est invalide.
    const candidate = User.create(input);

    const generatedPassword = generatePassword();
    const passwordHash = await this.passwordHasher.hash(generatedPassword);

    const persistedUser = await db.transaction(async (tx) => {
      // Unicité matricule (UNIQUE BD — vérif applicative pour erreur métier
      // typée plutôt qu'unique_violation Postgres brut).
      const existingByMatricule = await this.userRepository.findByMatricule(
        candidate.matricule,
        tx,
      );
      if (existingByMatricule !== null) {
        throw matriculeAlreadyExists(candidate.matricule);
      }

      const existingByEmail = await this.userRepository.findByEmail(candidate.email, tx);
      if (existingByEmail !== null) {
        throw emailAlreadyExists(candidate.email);
      }

      const created = await this.userRepository.save(candidate, passwordHash, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        // Cas anormal : actorId vient d'une session valide vérifiée par requireRole.
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "user",
        entityId: created.id,
        action: "USER_CREATED",
        afterData: created.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return created;
    });

    return { user: toDTO(persistedUser), generatedPassword };
  }
}
