// ==============================================================================
// LIC v2 — Page /login (F-07)
//
// Server Component. Tailwind brut + tokens DS SELECT-PX (refactor F-09 avec
// shadcn/ui). Pas de loader/spinner client à F-07 — la redirection est rapide.
// ==============================================================================

import { BrandLockup } from "@/components/brand/BrandLockup";
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
    <main className="bg-surface-0 flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandLockup size={48} tone="dark" />

        <div className="bg-surface-1 border-border-subtle flex w-full flex-col gap-6 rounded-lg border p-8">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-xl text-white">Connexion</h1>
            <p className="font-sans text-sm text-white/60">
              Accès au portail de gestion des licences
            </p>
          </div>

          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="font-sans text-xs uppercase tracking-wider text-white/70"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                className="bg-surface-2 border-border-subtle focus:border-spx-cyan-500 focus:ring-spx-cyan-500 rounded-md border px-3 py-2 font-sans text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1"
                placeholder="vous@s2m.ma"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="font-sans text-xs uppercase tracking-wider text-white/70"
              >
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="bg-surface-2 border-border-subtle focus:border-spx-cyan-500 focus:ring-spx-cyan-500 rounded-md border px-3 py-2 font-sans text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1"
              />
            </div>

            {errorMessage !== null && (
              <div
                role="alert"
                className="bg-surface-2 border-danger/40 flex flex-col gap-0.5 rounded-md border px-3 py-2"
              >
                <span className="text-danger/80 font-mono text-[10px] uppercase tracking-wider">
                  {errorCode}
                </span>
                <span className="text-danger font-sans text-sm">{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="bg-spx-cyan-500 hover:bg-spx-cyan-100 active:bg-spx-cyan-100 text-surface-0 font-display mt-2 rounded-md py-2.5 text-sm font-extrabold uppercase tracking-wider transition-colors"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
