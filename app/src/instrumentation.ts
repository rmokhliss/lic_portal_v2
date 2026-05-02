// ==============================================================================
// LIC v2 — Next.js 16 instrumentation hook (F-07)
//
// Exécuté UNE FOIS au boot du serveur Node (skip Edge runtime). Utilisé pour
// le bootstrap admin initial (création SADMIN si table vide + env vars set).
//
// Convention Next.js : ce fichier doit vivre à la racine de src/ (pas dans
// app/). https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
// ==============================================================================

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Imports dynamiques : evite de charger infrastructure/ dans Edge runtime
  // (qui n'a pas accès aux modules Node natifs comme postgres).
  const { bootstrapAdmin } = await import("@/server/infrastructure/auth");
  const { createChildLogger } = await import("@/server/infrastructure/logger");
  const log = createChildLogger("instrumentation");

  try {
    await bootstrapAdmin();
  } catch (err: unknown) {
    log.error({ err }, "Bootstrap admin a échoué (non bloquant pour le boot)");
  }
}
