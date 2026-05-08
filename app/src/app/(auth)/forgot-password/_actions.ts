// ==============================================================================
// LIC v2 — Server Action forgotPasswordAction (Phase 24)
//
// Endpoint public, NON authentifié. Reçoit un email, déclenche le reset via
// requestPasswordResetUseCase qui :
//   - cherche le user par email
//   - silent si email inconnu (anti-énumération)
//   - sinon : reset mot de passe + envoi email PASSWORD_RESET avec mot de
//     passe temporaire
//
// L'UI affiche TOUJOURS un message générique "si l'email existe, un message
// vous sera envoyé" — peu importe si le user existe ou non, pour éviter
// l'énumération d'emails par un attaquant.
// ==============================================================================

"use server";

import { z } from "zod";

import { requestPasswordResetUseCase } from "@/server/composition-root";
import { env } from "@/server/infrastructure/env";

const ForgotPasswordSchema = z
  .object({
    email: z.email().max(200),
  })
  .strict();

export async function forgotPasswordAction(formData: FormData): Promise<{
  /** Toujours true en sortie nominale — anti-énumération (le UI affiche le
   *  message générique de manière inconditionnelle). */
  readonly ok: boolean;
  readonly error?: string;
}> {
  const parsed = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Email mal formé = signal observable, on retourne quand même ok pour ne
    // pas distinguer (mais on log côté Pino pour observabilité interne).
    return { ok: true };
  }

  try {
    await requestPasswordResetUseCase.execute({
      email: parsed.data.email,
      loginUrl: `${env.APP_URL}/login`,
    });
  } catch (err) {
    // Erreur infra (BD down, SMTP down) : on remonte un message générique
    // côté UI mais on ne révèle pas la nature exacte. Le log Pino est posé
    // côté use-case.
    return {
      ok: false,
      error:
        err instanceof Error && err.message.length > 0
          ? "Service temporairement indisponible — réessayer plus tard."
          : "Erreur inconnue",
    };
  }

  return { ok: true };
}
