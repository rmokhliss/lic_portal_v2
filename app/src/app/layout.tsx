import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat, Poppins, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "./globals.css";
import { OtelProvider } from "@/components/shared/OtelProvider";

const montserrat = Montserrat({
  weight: "800",
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "500"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
    <html
      lang={locale}
      className={`${theme} ${montserrat.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
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
