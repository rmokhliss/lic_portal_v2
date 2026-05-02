// ==============================================================================
// LIC v2 — next-intl 4.x request config (F-11)
//
// `getRequestConfig` est appelé par next-intl pour chaque request server-side
// (Server Components, Server Actions, route handlers). Il détermine la locale
// active via le cookie NEXT_LOCALE (pas de préfixe URL — décision actée brief)
// et charge le fichier de messages correspondant.
//
// Fallback : si la locale du cookie est invalide ou absente, on retourne FR
// (default). next-intl gère le fallback EN au niveau message-clé manquante
// quand la locale active est EN ; en pratique on a parité de clés (test
// snapshot messages.spec.ts), donc le fallback ne se déclenche pas en runtime.
// ==============================================================================

import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const SUPPORTED_LOCALES = ["fr", "en"] as const;
const DEFAULT_LOCALE = "fr" as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: SupportedLocale = isSupportedLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  // Import dynamique : Next.js code-splitting par locale (le bundle ne charge
  // pas les deux fichiers).
  const messages = (await import(`./messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };

  return {
    locale,
    messages: messages.default,
  };
});
