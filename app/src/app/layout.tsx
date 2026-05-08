import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";
import { OtelProvider } from "@/components/shared/OtelProvider";

// Phase 24 — Réactivation Montserrat via Google Fonts CSS (link runtime client).
// `next/font/google` bloqué au build (CRYPT_E_REVOCATION_OFFLINE sur build
// server proxy) → on charge la stylesheet côté navigateur uniquement (pas de
// fetch au build). Si le navigateur user bloque fonts.googleapis.com, fallback
// sur les fonts système définies dans globals.css. Pour offline strict, passer
// à next/font/local avec WOFF2 dans public/fonts/.

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
      <head>
        {/* Phase 24 — Montserrat via CDN runtime (cf. note plus haut).
             preconnect pour réduire le RTT du fetch CSS + woff2. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap"
        />
      </head>
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
