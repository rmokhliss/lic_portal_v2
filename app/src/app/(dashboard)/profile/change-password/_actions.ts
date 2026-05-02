// ==============================================================================
// LIC v2 — Server Action changePasswordAction (F-07)
//
// Pattern Référentiel §4.13.6 :
//   1. requireAuth (throw UnauthorizedError SPX-LIC-001 si pas connecté)
//   2. ChangePasswordSchema.parse (Zod strict)
//   3. Appel use-case câblé via composition-root
//   4. revalidatePath + redirect("/")
//
// En cas d'AppError attendue (SPX-LIC-002, SPX-LIC-901), on RETOURNE un objet
// d'erreur pour affichage inline du form client (pas de throw qui produirait
// une error boundary 500).
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { ChangePasswordSchema } from "@s2m-lic/shared/schemas/auth.schema";
import { changePasswordUseCase } from "@/server/composition-root";
import { requireAuth } from "@/server/infrastructure/auth";
import { AppError } from "@/server/modules/error";

export interface ChangePasswordActionInput {
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export interface ChangePasswordActionResult {
  readonly ok: false;
  readonly error: { readonly code: string; readonly message: string };
}

export async function changePasswordAction(
  input: ChangePasswordActionInput,
): Promise<ChangePasswordActionResult> {
  const user = await requireAuth();

  try {
    const parsed = ChangePasswordSchema.parse(input);
    await changePasswordUseCase.execute({
      userId: user.id,
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
      userDisplay: user.display,
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "SPX-LIC-901",
          message: err.issues[0]?.message ?? "Données fournies invalides",
        },
      };
    }
    if (err instanceof AppError) {
      return {
        ok: false,
        error: { code: err.code, message: err.message },
      };
    }
    // Erreur inattendue : on log côté serveur et on remonte un code générique.
    return {
      ok: false,
      error: { code: "SPX-LIC-900", message: "Erreur interne du serveur" },
    };
  }

  // Succès : invalider les caches Server Components + redirect vers home.
  revalidatePath("/");
  redirect("/");
}
