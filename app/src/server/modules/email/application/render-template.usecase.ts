// ==============================================================================
// LIC v2 — RenderTemplateUseCase (Phase 14 — DETTE-003)
//
// Wrapper minimal autour du port TemplateRenderer. Permet aux callers (autres
// use-cases hors module email) de ne dépendre que d'un use-case (pas du port
// directement) — facilite mocking et respecte la frontière hexagonale.
// ==============================================================================

import type {
  EmailTemplateName,
  RenderedTemplate,
  TemplateRenderer,
} from "../ports/template-renderer";

export class RenderTemplateUseCase {
  constructor(private readonly renderer: TemplateRenderer) {}

  execute(
    template: EmailTemplateName,
    variables: Readonly<Record<string, string | number>>,
  ): RenderedTemplate {
    return this.renderer.render(template, variables);
  }
}
