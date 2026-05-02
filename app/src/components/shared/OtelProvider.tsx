"use client";

// ==============================================================================
// LIC v2 — OtelProvider (Client Component, F-10 — clôt DETTE-LIC-001)
//
// Initialise le SDK OpenTelemetry Web côté browser et active la propagation
// automatique du header `traceparent` (W3C Trace Context) sur toutes les
// requêtes window.fetch (Server Actions Next.js + autres XHR same-origin).
//
// Scope F-10 strict :
//   - Propagation traceparent client→serveur (suffisant pour corréler les
//     logs Pino serveur avec les actions UI)
//   - Pas de spans browser complets (Web Vitals, navigation, erreurs JS)
//     → différé Phase 13
//   - Pas d'exporter OTLP (ConsoleSpanExporter en dev pour debug visuel only)
//     → exporter OTLP configuré Phase 13 quand collector déployé
//
// ───────────────────────────────────────────────────────────────────────────
// Écart vs Référentiel §1.3 mineur — Le Référentiel mentionne "OpenTelemetry
// Web 0.x latest" mais @opentelemetry/sdk-trace-web n'a jamais eu de 0.x
// stable (1.x → 2.x). Branche 1.x figée à 1.30.1 (avril 2026), latest stable
// 2.7.1 (mai 2026+). Choix : latest stable pour cohérence avec
// instrumentation-fetch 0.216 (release groupée OTel).
// API 2.x breaking change : SpanProcessor passé via le constructeur
// (spanProcessors: [...]), plus addSpanProcessor() runtime.
// À remonter au Master Référentiel dans la prochaine vague groupée
// (cf. F-05 écart postgres.js vs pg).
// ───────────────────────────────────────────────────────────────────────────
// ==============================================================================

import { useEffect } from "react";

let initialized = false;

function initOtel(): void {
  // No-op SSR : Next.js rend les Client Components côté serveur lors du SSR.
  // window est absent → on quitte sans rien faire.
  if (typeof window === "undefined") return;
  // Idempotence : initOtel peut être appelé plusieurs fois (re-render
  // composant, fast refresh, StrictMode double useEffect dev). On
  // n'initialise qu'une seule fois.
  if (initialized) return;
  initialized = true;

  // Imports dynamiques : le SDK OTel Web ne doit JAMAIS être chargé côté SSR
  // (dépend de window.fetch, Performance API, etc.). Imports dynamiques
  // garantissent que le bundle SSR ne charge pas ces modules.
  void (async () => {
    const { WebTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } =
      await import("@opentelemetry/sdk-trace-web");
    const { W3CTraceContextPropagator } = await import("@opentelemetry/core");
    const { registerInstrumentations } = await import("@opentelemetry/instrumentation");
    const { FetchInstrumentation } = await import("@opentelemetry/instrumentation-fetch");

    // SpanProcessor en dev : ConsoleSpanExporter pour debug visuel (chaque
    // span imprimé dans la devtools console). En prod : aucun processor →
    // les spans sont créés mais non exportés (suffisant pour la propagation
    // traceparent qui se fait avant l'export).
    const spanProcessors =
      process.env.NODE_ENV === "development"
        ? [new BatchSpanProcessor(new ConsoleSpanExporter())]
        : [];

    // API 2.x : SpanProcessor passé via le constructeur (vs addSpanProcessor
    // runtime de l'API 1.x).
    const provider = new WebTracerProvider({ spanProcessors });
    provider.register({
      // Explicite (vs default implicite du SDK 2.x) — c'est le propagateur
      // qui injecte le header `traceparent` dans toutes les requêtes fetch
      // instrumentées (W3C Trace Context standard).
      propagator: new W3CTraceContextPropagator(),
    });

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          // Propagate traceparent à TOUTES les URLs same-origin (par défaut
          // OTel n'envoie que vers les domaines listés). LIC est mono-origine
          // → on autorise window.location.origin qui couvre dev + prod.
          propagateTraceHeaderCorsUrls: [new RegExp(`^${window.location.origin}`)],
        }),
      ],
    });

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- debug local OTel uniquement, gated dev
      console.debug("[OTel] Web SDK initialized — traceparent propagation active");
    }
  })();
}

export function OtelProvider({ children }: { readonly children: React.ReactNode }) {
  // useEffect garantit l'exécution côté client uniquement, après le mount.
  // Pas de re-init si le composant re-render (initialized garde l'état).
  useEffect(() => {
    initOtel();
  }, []);

  return <>{children}</>;
}
