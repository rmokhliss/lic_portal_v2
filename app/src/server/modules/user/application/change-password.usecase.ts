// ==============================================================================
// LIC v2 — Use-case ChangePasswordUseCase (F-07, refactor F-08 option (b))
//
// Orchestration transactionnelle :
//   1. findById(userId, tx)
//   2. bcrypt.compare(currentPassword, user.passwordHash) — sinon SPX-LIC-002
//   3. bcrypt.hash(newPassword, cost=10)
//   4. updatePassword(userId, newHash, tx) — bump tokenVersion + must_change_password=false
//   5. AuditEntry.create(...) + auditRepository.save(entry, tx)
//
// Le tout dans une SEULE transaction : règle L3 (audit dans la même transaction
// que la mutation) garantie.
//
// F-08 option (b) : injection directe de AuditRepository (pas du use-case
// recordAuditEntry). Préserve l'isolation hexagonale (application → ports
// uniquement, pas application → application cross-module).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { UnauthorizedError } from "@/server/modules/error";
import type { PasswordHasher } from "@/server/modules/user/ports/password-hasher";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

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
    private readonly auditRepository: AuditRepository,
    /** Phase 15 — port PasswordHasher (audit Master 5.1) — découple bcryptjs
     *  de la couche application. Adapter prod : BcryptPasswordHasher. */
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: ChangePasswordUseCaseInput): Promise<void> {
    await db.transaction(async (tx) => {
      const user = await this.userRepository.findById(input.userId, tx);
      if (!user) {
        // Cas anormal : userId vient d'une session valide, l'user devrait exister.
        throw new UnauthorizedError({ code: "SPX-LIC-001" });
      }

      const ok = await this.passwordHasher.verify(input.currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedError({
          code: "SPX-LIC-002",
          message: "Mot de passe actuel incorrect",
        });
      }

      const newHash = await this.passwordHasher.hash(input.newPassword);
      await this.userRepository.updatePassword(input.userId, newHash, tx);

      // Audit dans la MÊME transaction (règle L3). Pas de password_hash dans
      // before/after — fuite à éviter même en interne.
      const entry = AuditEntry.create({
        entity: "user",
        entityId: input.userId,
        action: "PASSWORD_CHANGED",
        beforeData: { mustChangePassword: user.mustChangePassword },
        afterData: { mustChangePassword: false, tokenVersionBumped: true },
        userId: input.userId,
        userDisplay: input.userDisplay,
        ipAddress: input.ipAddress,
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);
    });
  }
}
