// ==============================================================================
// LIC v2 — Page /login (F-09 refactor shadcn/ui + DS SELECT-PX overrides)
//
// Server Component. Composants shadcn (<Input>, <Label>, <Button> via
// <SubmitButton>) câblés sur les CSS vars shadcn → tokens DS SELECT-PX
// (cf. globals.css F-09). Mode dark uniquement (className="dark" sur <html>).
// ==============================================================================

import { BrandLockup } from "@/components/brand/BrandLockup";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ERROR_CATALOGUE, type ErrorCode } from "@s2m-lic/shared/constants/error-codes";

import { loginAction } from "./_actions";

interface LoginPageProps {
  // Next.js 15+ : searchParams est async.
  readonly searchParams: Promise<{ readonly error?: string }>;
}

function isErrorCode(value: string | undefined): value is ErrorCode {
  return value !== undefined && value in ERROR_CATALOGUE;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = isErrorCode(params.error) ? params.error : undefined;
  const errorMessage = errorCode ? ERROR_CATALOGUE[errorCode].defaultMessage : null;

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandLockup size={48} tone="dark" />

        <div className="bg-card border-border flex w-full flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-foreground text-xl">Connexion</h1>
            <p className="text-muted-foreground font-sans text-sm">
              Accès au portail de gestion des licences
            </p>
          </div>

          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="email"
                className="text-muted-foreground text-xs uppercase tracking-wider"
              >
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="vous@s2m.ma"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="password"
                className="text-muted-foreground text-xs uppercase tracking-wider"
              >
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {errorMessage !== null && (
              <div
                role="alert"
                className="bg-secondary border-destructive/40 flex flex-col gap-0.5 rounded-md border px-3 py-2"
              >
                <span className="text-destructive/80 font-mono text-[10px] uppercase tracking-wider">
                  {errorCode}
                </span>
                <span className="text-destructive font-sans text-sm">{errorMessage}</span>
              </div>
            )}

            <SubmitButton className="font-display mt-2 font-extrabold uppercase tracking-wider">
              Se connecter
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}
