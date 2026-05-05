// ==============================================================================
// LIC v2 — Port TemplateRenderer (Phase 14 — DETTE-003)
//
// Compile un template MJML + variables → { html, text }. Implémentation MJML
// dans adapters/mjml/. Pattern port pour permettre des renderers alternatifs
// (Handlebars text-only par ex.) sans toucher aux use-cases.
// ==============================================================================

export type EmailTemplateName =
  | "password-reset"
  | "password-changed"
  | "user-welcome"
  | "licence-expiring"
  | "volume-threshold";

export interface RenderedTemplate {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export abstract class TemplateRenderer {
  abstract render(
    template: EmailTemplateName,
    variables: Readonly<Record<string, string | number>>,
  ): RenderedTemplate;
}
