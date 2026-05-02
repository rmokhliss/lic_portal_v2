// ==============================================================================
// LIC v2 — Server Actions du layout dashboard (F-12)
//
// signOutAction   : wrap Auth.js signOut + redirect /login.
// setLocaleAction : valide locale ∈ {fr, en} (Zod) + cookie NEXT_LOCALE +
//                   revalidatePath('/').
// ==============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signOut } from "@/server/infrastructure/auth";
import { env } from "@/server/infrastructure/env";
import { ValidationError } from "@/server/modules/error";

export async function signOutAction(): Promise<never> {
  await signOut({ redirectTo: "/login" });
  // signOut throw NEXT_REDIRECT (intercepté par Next.js) — ligne suivante
  // inaccessible mais TS exige le never explicit.
  redirect("/login");
}

const LocaleSchema = z.enum(["fr", "en"]);

export async function setLocaleAction(locale: string): Promise<void> {
  const parsed = LocaleSchema.safeParse(locale);
  if (!parsed.success) {
    throw new ValidationError({
      code: "SPX-LIC-901",
      message: `locale invalide : "${locale}" — attendu fr ou en`,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", parsed.data, {
    path: "/",
    sameSite: "strict",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  });

  revalidatePath("/");
}
