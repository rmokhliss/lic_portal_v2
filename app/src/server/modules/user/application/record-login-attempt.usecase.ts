// ==============================================================================
// LIC v2 — RecordLoginAttemptUseCase (Phase 15 — audit Master C1, brute-force)
//
// Encapsule la logique de comptage des échecs de login + lockout 60 min après
// 5 échecs consécutifs. Appelé depuis `infrastructure/auth/config.ts` qui
// implémente le provider Credentials Auth.js v5 (Variante B — auth boundary
// reste en infrastructure, ADR-0010).
//
// Pattern hexagonal préservé : on passe par UserRepository.findLoginCounters /
// recordLoginFailure / resetLoginCounters (3 méthodes ajoutées Phase 15).
//
// Décisions :
//   1. **Fenêtre glissante 60 min** : `last_failed_login_at + 60 min < NOW()`
//      → le compteur est considéré « expiré » et le compte n'est PAS verrouillé,
//      indépendamment de la valeur de failed_login_count. C'est moins strict
//      que reset+0 sur expiration mais évite une UPDATE supplémentaire à la
//      lecture.
//   2. **Audit `LOGIN_FAILED_LOCKOUT`** : émis UNIQUEMENT quand le seuil 5 est
//      atteint pour la première fois (passage de 4 → 5). Évite de spammer
//      l'audit log pour des bots qui retentent en boucle.
//   3. **Reset sur succès** : `UPDATE failed_login_count = 0, last_failed_login_at = NULL`.
// ==============================================================================

import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";

import type { UserRepository } from "../ports/user.repository";

/** Seuil d'échecs consécutifs avant lockout (audit Master C1). */
export const LOGIN_LOCKOUT_THRESHOLD = 5;
/** Durée de lockout en millisecondes (60 min — Référentiel v2.1 §4.17). */
export const LOGIN_LOCKOUT_WINDOW_MS = 60 * 60 * 1000;

export class RecordLoginAttemptUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  /** Avant d'évaluer le mot de passe : retourne `true` si le compte est dans
   *  la fenêtre de lockout (5 échecs récents <60 min). */
  isLockedOut(failedCount: number, lastFailedAt: Date | null, now: Date = new Date()): boolean {
    if (failedCount < LOGIN_LOCKOUT_THRESHOLD) return false;
    if (lastFailedAt === null) return false;
    return now.getTime() - lastFailedAt.getTime() < LOGIN_LOCKOUT_WINDOW_MS;
  }

  /** Lecture des compteurs courants. Wrapper qui retourne 0/null si l'user
   *  n'existe pas (cas anormal — login flow vérifie déjà l'existence). */
  async readCounters(
    userId: string,
  ): Promise<{ failedLoginCount: number; lastFailedLoginAt: Date | null }> {
    const counters = await this.userRepository.findLoginCounters(userId);
    return counters ?? { failedLoginCount: 0, lastFailedLoginAt: null };
  }

  /** Sur échec : incrémente compteur + horodatage. Si seuil atteint pour la
   *  première fois (passage 4 → 5), émet un audit LOGIN_FAILED_LOCKOUT. */
  async recordFailure(
    userId: string,
    userDisplay: string,
    currentFailedCount: number,
  ): Promise<void> {
    const newCount = currentFailedCount + 1;
    const now = new Date();
    await this.userRepository.recordLoginFailure(userId, newCount, now);

    if (newCount === LOGIN_LOCKOUT_THRESHOLD) {
      const entry = AuditEntry.create({
        entity: "user",
        entityId: userId,
        action: "LOGIN_FAILED_LOCKOUT",
        afterData: {
          failedLoginCount: newCount,
          lockoutUntil: new Date(now.getTime() + LOGIN_LOCKOUT_WINDOW_MS).toISOString(),
        },
        userId,
        userDisplay,
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry);
    }
  }

  /** Sur succès : reset compteur + horodatage. */
  async recordSuccess(userId: string): Promise<void> {
    await this.userRepository.resetLoginCounters(userId);
  }
}
