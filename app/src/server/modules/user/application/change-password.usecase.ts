// ==============================================================================
// LIC v2 — Use-case ChangePasswordUseCase (F-07)
//
// Orchestration transactionnelle :
//   1. findById(userId, tx)
//   2. bcrypt.compare(currentPassword, user.passwordHash) — sinon SPX-LIC-002
//   3. bcrypt.hash(newPassword, cost=10)
//   4. updatePassword(userId, newHash, tx) — bump tokenVersion + must_change_password=false
//   5. auditRecorder.record({ entity:"user", action:"PASSWORD_CHANGED", ... }, tx)
//
// Le tout dans une SEULE transaction : règle L3 (audit dans la même transaction
// que la mutation) garantie.
// ==============================================================================

import bcryptjs from "bcryptjs";

import { db } from "@/server/infrastructure/db/client";
import { UnauthorizedError } from "@/server/modules/error";
import type { AuditRecorder } from "@/server/modules/audit/ports/audit.recorder";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

const BCRYPT_COST = 10;

export interface ChangePasswordUseCaseInput {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly userDisplay: string;
  readonly ipAddress?: string;
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(input: ChangePasswordUseCaseInput): Promise<void> {
    await db.transaction(async (tx) => {
      const user = await this.userRepository.findById(input.userId, tx);
      if (!user) {
        // Cas anormal : userId vient d'une session valide, l'user devrait exister.
        throw new UnauthorizedError({ code: "SPX-LIC-001" });
      }

      const ok = await bcryptjs.compare(input.currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedError({
          code: "SPX-LIC-002",
          message: "Mot de passe actuel incorrect",
        });
      }

      const newHash = await bcryptjs.hash(input.newPassword, BCRYPT_COST);
      await this.userRepository.updatePassword(input.userId, newHash, tx);

      // Audit dans la MÊME transaction (règle L3). Pas de password_hash dans
      // before/after — fuite éviter même en interne.
      await this.auditRecorder.record(
        {
          entity: "user",
          entityId: input.userId,
          action: "PASSWORD_CHANGED",
          beforeData: { mustChangePassword: user.mustChangePassword },
          afterData: { mustChangePassword: false, tokenVersionBumped: true },
          userId: input.userId,
          userDisplay: input.userDisplay,
          ipAddress: input.ipAddress,
          mode: "MANUEL",
        },
        tx,
      );
    });
  }
}
