// ==============================================================================
// LIC v2 — Schémas Zod auth (F-07)
//
// Source de vérité UI ↔ serveur pour les payloads d'auth :
//   - LoginSchema : POST /login (email + password)
//   - ChangePasswordSchema : POST /profile/change-password
// ==============================================================================

import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email(),
  // min(1) seulement : la complexité réelle est validée à la création/changement
  // de mot de passe (ChangePasswordSchema), pas à chaque login.
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    // Politique min 12 chars (cohérente avec INITIAL_ADMIN_PASSWORD env var).
    // Durcissement (regex complexité, dictionnaire, etc.) à F-13.
    newPassword: z.string().min(12),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Le nouveau mot de passe et sa confirmation ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
