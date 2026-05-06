// ==============================================================================
// LIC v2 — BrandLockup (Phase 20 R-26 — auto-adaptatif au thème)
//
// Avant : prop `tone='dark' | 'light'` figée à l'utilisation, ce qui rendait
// le logo invisible quand le thème global bascule (texte blanc sur fond
// blanc en mode light, vs blanc sur fond dark en mode dark).
//
// Après : `tone` désormais optionnel et purement override (cas de logo
// inline sur une carte sombre en mode light, par ex). Par défaut, le
// composant utilise les vars DS `--foreground` / `--muted-foreground` /
// `--border` qui flip automatiquement via `:root.light` (cf. globals.css
// Phase 19+ R-02). Le logo reste lisible quel que soit le thème.
// ==============================================================================

import { brand } from "@/lib/brand";

import { SpxTile } from "./SpxTile";

type Tone = "light" | "dark";

export function BrandLockup({ size = 40, tone }: { size?: number; tone?: Tone }) {
  if (tone === undefined) {
    // Mode adaptatif (défaut Phase 20 R-26) — couleurs DS dynamiques.
    return (
      <div className="flex items-center gap-3">
        <SpxTile size={size} />
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.18em]">
            {brand.parent}
          </span>
          <span className="text-foreground font-display text-lg font-extrabold">
            {brand.code}
            <span className="text-border mx-0.5">_</span>
            {brand.suffix}
          </span>
        </div>
      </div>
    );
  }

  // Mode override explicite (rétrocompat — le composant peut être placé sur
  // une surface qui ne suit pas le thème global, ex: dialog modal sur fond
  // dark en mode light, footer marketing dark always, etc.).
  const isDark = tone === "dark";
  return (
    <div className="flex items-center gap-3">
      <SpxTile size={size} />
      <div className="flex flex-col leading-tight">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
            isDark ? "text-white/60" : "text-spx-ink/60"
          }`}
        >
          {brand.parent}
        </span>
        <span
          className={`font-display text-lg font-extrabold ${
            isDark ? "text-white" : "text-spx-ink"
          }`}
        >
          {brand.code}
          <span className={`mx-0.5 ${isDark ? "text-border-subtle" : "text-spx-ink/30"}`}>_</span>
          {brand.suffix}
        </span>
      </div>
    </div>
  );
}
