// ==============================================================================
// LIC v2 — Server Action loginAction (F-07)
//
// Wrappe signIn("credentials") d'Auth.js. Codes erreur SPX-LIC-NNN propagés via
// query string ?error=SPX-LIC-XXX (lu par /login page pour affichage inline).
// ==============================================================================

"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { CredentialsSignin } from "next-auth";

import { LoginSchema } from "@s2m-lic/shared/schemas/auth.schema";
import { signIn } from "@/server/infrastructure/auth";

export async function loginAction(formData: FormData): Promise<never> {
  // 1. Validation Zod stricte (CLAUDE.md §3 + Référentiel §4.13.6)
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/login?error=SPX-LIC-901");
  }

  // 2. signIn déclenche un redirect interne (NEXT_REDIRECT) en cas de succès.
  //    On laisse propager. Pour les erreurs typées, catch + redirect contrôlé.
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (err: unknown) {
    // Le redirect interne de Next.js est une erreur "thenable" qu'il faut RE-throw.
    if (isRedirectError(err)) throw err;

    if (err instanceof CredentialsSignin) {
      redirect(`/login?error=${err.code}`);
    }
    // Erreur inattendue (BD down, etc.)
    redirect("/login?error=SPX-LIC-900");
  }

  // Inaccessible : signIn redirige toujours en cas de succès.
  redirect("/login?error=SPX-LIC-900");
}
