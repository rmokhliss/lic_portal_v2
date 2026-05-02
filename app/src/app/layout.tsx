import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat, Poppins, JetBrains_Mono } from "next/font/google";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`dark ${montserrat.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <OtelProvider>{children}</OtelProvider>
      </body>
    </html>
  );
}
