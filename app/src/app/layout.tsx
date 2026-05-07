import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";
import { OtelProvider } from "@/components/shared/OtelProvider";

// Phase 23 — `next/font/google` retiré : le build offline (proxy/firewall
// bloquant fonts.googleapis.com avec CRYPT_E_REVOCATION_OFFLINE) ne peut pas
// fetch Montserrat/Poppins/JetBrains Mono au moment du build prod. Les
// fallbacks CSS dans globals.css (Helvetica Neue / system-ui / ui-monospace)
// prennent le relais. Pour réactiver les fonts SELECT-PX :
//   - soit re-importer next/font/google quand le réseau permet le fetch
//   - soit télécharger les WOFF2 dans public/fonts/ et utiliser
//     next/font/local (recommandé pour la robustesse offline).

export const metadata: Metadata = {
  title: "Licence Manager",
  description: "SELECT-PX · Portail de gestion des licences S2M",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // next-intl 4.x : getLocale() lit le cookie NEXT_LOCALE (ou fallback FR)
  // via la config app/src/i18n/request.ts. getMessages() charge le JSON
  // de la locale active. Ordre wrappers : OtelProvider extérieur (observabilité
  // d'abord) → NextIntlClientProvider intérieur (i18n pour tous les composants).
  const locale = await getLocale();
  const messages = await getMessages();

  // Phase 17 F1 — thème depuis cookie `spx-lic.theme`. Défaut = dark si absent
  // ou valeur invalide. Tailwind `darkMode: 'class'` consomme la classe sur
  // <html>. Le toggle est rendu dans AppHeader, lit le même cookie.
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("spx-lic.theme")?.value;
  const theme = themeCookie === "light" ? "light" : "dark";

  return (
    <html lang={locale} className={theme}>
      <body className="font-sans antialiased">
        <OtelProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </OtelProvider>
      </body>
    </html>
  );
}
