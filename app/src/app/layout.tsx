import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat, Poppins, JetBrains_Mono } from "next/font/google";
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

  return (
    <html
      lang={locale}
      className={`dark ${montserrat.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
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
