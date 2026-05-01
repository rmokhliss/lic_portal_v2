import { BrandLockup } from "@/components/brand/BrandLockup";

// TODO Phase 11 — remplacer par EC-01 Dashboard (cf. PROJECT_CONTEXT_LIC.md §8.3).
//   Cette page d'accueil minimale est temporaire (PROJECT_CONTEXT_LIC.md §2 — Phase 1 Bootstrap).
export default function HomePage() {
  return (
    <main className="bg-surface-0 flex min-h-screen flex-col items-center justify-center gap-10 p-8 text-white">
      <BrandLockup size={80} tone="dark" />
      <p className="font-mono text-sm uppercase tracking-[0.2em] text-white/60">
        Phase 1 — Bootstrap
      </p>
    </main>
  );
}
