// ==============================================================================
// LIC v2 — Rate limit helper (Phase 13.A)
//
// Helper léger en mémoire pour les Server Actions sensibles (login indirect
// via change-password, reset-password admin). Pas de Redis (mono-tenant +
// volume faible). En cluster multi-pod, chaque pod a son propre Map → plafond
// effectif = max × N pods. Acceptable pour un back-office interne.
//
// Si dépassement, throw `RateLimitError` (SPX-LIC-904, HTTP 429). Le caller
// laisse remonter — Auth.js / Next.js gérera l'affichage côté UI.
//
// Usage typique :
//   await requireRole(["SADMIN"]);
//   rateLimit(`reset-password:${actor.id}`, 5, 60_000); // 5 / minute / actor
//   await resetUserPasswordUseCase.execute(...);
// ==============================================================================

import { RateLimitError } from "@/server/modules/error";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Vérifie le rate limit pour `key`. Si dépassement, throw RateLimitError
 * (SPX-LIC-904). Sinon incrémente le compteur.
 *
 * - `max` : nombre max de requêtes autorisées dans la fenêtre
 * - `windowMs` : taille de la fenêtre en ms
 *
 * Note : le bucket reset complètement à expiration (sliding window approchée
 * par fixed window — acceptable pour rate limit défensif).
 */
export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket === undefined || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count++;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    throw new RateLimitError({
      code: "SPX-LIC-904",
      message: `Trop de requêtes. Réessayez dans ${String(retryAfterSec)}s.`,
      details: { key, max, windowMs, retryAfterSec },
    });
  }
}

/** Test helper : vide tous les buckets (utilisé dans afterEach). */
export function resetRateLimitForTests(): void {
  buckets.clear();
}
