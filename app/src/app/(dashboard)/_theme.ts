// ==============================================================================
// LIC v2 — Types + constantes thème (Phase 17 F1)
//
// Séparé du `_actions.ts` car les fichiers "use server" Next.js n'autorisent
// QUE des exports de fonctions async. Les types et constantes vont ici.
// ==============================================================================

export type Theme = "dark" | "light";

export const THEME_COOKIE_NAME = "spx-lic.theme";
