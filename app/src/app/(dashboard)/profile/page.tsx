// ==============================================================================
// LIC v2 — /profile (Phase 12.A, EC-14)
//
// Page profil utilisateur connecté. Affichage seulement (matricule, nom,
// prénom, email, rôle). Bouton "Changer le mot de passe" → /change-password
// (page existante depuis Phase 2.A, sous (auth)/). Logout déjà géré via
// UserMenu dans AppHeader.
//
// 12.B : le flow force-change-password est déjà implémenté dans
// `requireAuthPage` (auth/index.ts:62-71) qui redirige vers /change-password
// quand `mustChangePassword=true`. Aucun middleware Next.js supplémentaire
// requis — la garde Server Component est suffisante (toutes les pages
// dashboard appellent requireAuthPage en amont).
// ==============================================================================

import Link from "next/link";

import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requireAuthPage } from "@/server/infrastructure/auth";

export default async function ProfilePage() {
  const user = await requireAuthPage();
  const t = await getTranslations("profil");

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display text-foreground text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <section className="border-border bg-surface-1 max-w-2xl rounded-md border p-6">
        <h2 className="font-display text-foreground mb-4 text-base">{t("infoSection")}</h2>
        <dl className="grid grid-cols-1 gap-y-3 md:grid-cols-2">
          <Field label={t("fields.matricule")} value={user.matricule} mono />
          <Field label={t("fields.role")} value={user.role} mono />
          <Field label={t("fields.display")} value={user.display} colSpan2 />
          <Field label={t("fields.email")} value={user.email} colSpan2 />
        </dl>
      </section>

      <section className="border-border bg-surface-1 mt-6 max-w-2xl rounded-md border p-6">
        <h2 className="font-display text-foreground mb-2 text-base">{t("securitySection")}</h2>
        <p className="text-muted-foreground mb-4 text-sm">{t("securityHint")}</p>
        <Button asChild>
          <Link href="/change-password">{t("changePassword")}</Link>
        </Button>
        {user.mustChangePassword && (
          <p className="text-warning mt-3 text-xs">⚠ {t("mustChangeWarning")}</p>
        )}
      </section>

      <section className="mt-6 max-w-2xl">
        <p className="text-muted-foreground text-xs">{t("logoutHint")}</p>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  colSpan2,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
  readonly colSpan2?: boolean;
}) {
  return (
    <div className={colSpan2 === true ? "md:col-span-2" : undefined}>
      <dt className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</dt>
      <dd className={`text-foreground mt-0.5 text-sm ${mono === true ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
