// ==============================================================================
// LIC v2 — Déclaration de types minimale pour mjml (Phase 14 — DETTE-003)
//
// Le package `mjml` n'expose pas de types officiels. On déclare ici la surface
// utilisée par template-renderer.mjml.ts uniquement (compile + erreurs).
// ==============================================================================

declare module "mjml" {
  export interface MjmlError {
    readonly message: string;
    readonly line?: number;
    readonly tagName?: string;
    readonly formattedMessage?: string;
  }

  export interface MjmlResult {
    readonly html: string;
    readonly errors: readonly MjmlError[];
    readonly json?: unknown;
  }

  export interface MjmlOptions {
    readonly validationLevel?: "strict" | "soft" | "skip";
    readonly fonts?: Readonly<Record<string, string>>;
    readonly keepComments?: boolean;
    readonly minify?: boolean;
  }

  function mjml2html(input: string, options?: MjmlOptions): MjmlResult;
  export default mjml2html;
}
