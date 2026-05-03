// ==============================================================================
// LIC v2 — UpdateUserUseCase (Phase 2.B.bis EC-08)
//
// Patch sur nom / prenom / role uniquement (email + matricule immuables).
//
// Orchestration transactionnelle :
//   1. db.transaction:
//      a. findByIdEntity(userId) → throw SPX-LIC-720 si null
//      b. existing.withProfile(patch) → throw SPX-LIC-722 si validation
//      c. updateProfile(updated)
//      d. Choix code audit selon le diff :
//         - role changé          → USER_ROLE_CHANGED
//         - sinon (nom/prenom)   → USER_UPDATED   (cf. Q2 validé Stop 2)
//      e. Audit entry avec beforeData/afterData restreint aux champs modifiés
//
// Pas de mutation si patch vide (no-op silencieux + retourne user actuel).
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";

import { toDTO, type UserDTO } from "../adapters/postgres/user.mapper";
import type { UserRole } from "../domain/user.entity";
import { userNotFoundById } from "../domain/user.errors";
import type { UserRepository } from "../ports/user.repository";

export interface UpdateUserUseCaseInput {
  readonly userId: string;
  readonly nom?: string;
  readonly prenom?: string;
  readonly role?: UserRole;
}

export interface UpdateUserUseCaseOutput {
  readonly user: UserDTO;
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: UpdateUserUseCaseInput, actorId: string): Promise<UpdateUserUseCaseOutput> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.userRepository.findByIdEntity(input.userId, tx);
      if (existing === null) {
        throw userNotFoundById(input.userId);
      }

      const patched = existing.withProfile({
        nom: input.nom,
        prenom: input.prenom,
        role: input.role,
      });

      // Diff calculé sur l'instance avant/après pour décider du code audit
      // et du payload before/after restreint aux champs réellement changés.
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      let roleChanged = false;
      if (patched.nom !== existing.nom) {
        before.nom = existing.nom;
        after.nom = patched.nom;
      }
      if (patched.prenom !== existing.prenom) {
        before.prenom = existing.prenom;
        after.prenom = patched.prenom;
      }
      if (patched.role !== existing.role) {
        before.role = existing.role;
        after.role = patched.role;
        roleChanged = true;
      }

      const hasChange = Object.keys(after).length > 0;
      if (!hasChange) {
        // No-op : rien à persister, pas d'audit. Retourne l'existant.
        return existing;
      }

      await this.userRepository.updateProfile(patched, tx);

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
        action: roleChanged ? "USER_ROLE_CHANGED" : "USER_UPDATED",
        beforeData: before,
        afterData: after,
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return { user: toDTO(updated) };
  }
}
