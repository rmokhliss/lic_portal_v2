// ==============================================================================
// LIC v2 — ResetUserPasswordUseCase (Phase 2.B.bis EC-08)
//
// Reset par admin. Distinct de change-password (initié par l'user lui-même) :
//   - Pose `must_change_password = TRUE` (user devra changer au prochain login)
//   - Bump `token_version` → révoque les sessions actives
//   - Audit USER_PASSWORD_RESET_BY_ADMIN
//
// Orchestration transactionnelle :
//   1. db.transaction:
//      a. findByIdEntity(userId) → throw SPX-LIC-720 si null
//      b. generatePassword() → bcrypt.hash(cost=10)
//      c. resetPassword(id, hash)
//      d. Audit (pas de hash dans afterData — sécurité)
//
// Retourne { user, newPassword } — le caller (Server Action) log Pino
// `user_password_to_communicate` puis renvoie au client UI pour affichage
// UNIQUE dans PasswordRevealDialog.
// ==============================================================================

import bcryptjs from "bcryptjs";

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";

import { toDTO, type UserDTO } from "../adapters/postgres/user.mapper";
import { generatePassword } from "../domain/password";
import { userNotFoundById } from "../domain/user.errors";
import type { UserRepository } from "../ports/user.repository";

const BCRYPT_COST = 10;

export interface ResetUserPasswordUseCaseInput {
  readonly userId: string;
}

export interface ResetUserPasswordUseCaseOutput {
  readonly user: UserDTO;
  readonly newPassword: string;
}

export class ResetUserPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
    input: ResetUserPasswordUseCaseInput,
    actorId: string,
  ): Promise<ResetUserPasswordUseCaseOutput> {
    const newPassword = generatePassword();
    const passwordHash = await bcryptjs.hash(newPassword, BCRYPT_COST);

    const targetUser = await db.transaction(async (tx) => {
      const existing = await this.userRepository.findByIdEntity(input.userId, tx);
      if (existing === null) {
        throw userNotFoundById(input.userId);
      }

      await this.userRepository.resetPassword(existing.id, passwordHash, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "user",
        entityId: existing.id,
        action: "USER_PASSWORD_RESET_BY_ADMIN",
        // Pas de mot de passe en clair ni de hash dans l'audit (règle L3 + sécurité).
        // Le snapshot capture l'effet métier (force-change + bump tokenVersion).
        afterData: {
          mustChangePassword: true,
          tokenVersionBumped: true,
        },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return existing;
    });

    return { user: toDTO(targetUser), newPassword };
  }
}
