import { brand } from "@/lib/brand";
import { SpxTile } from "./SpxTile";

type Tone = "light" | "dark";

export function BrandLockup({ size = 40, tone = "light" }: { size?: number; tone?: Tone }) {
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
