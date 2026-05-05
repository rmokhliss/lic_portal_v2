// ==============================================================================
// LIC v2 — Adapter TemplateRenderer MJML (Phase 14 — DETTE-003)
//
// Compile les MJML embarqués → HTML responsive cross-client. Variables
// substituées via {{varName}} avant compilation. Sujet et corps texte stockés
// hors MJML pour éviter la lourdeur d'un parser MJML pour 1 ligne de texte.
//
// Templates supportés :
//   - password-reset      ({prenom, motDePasseTemp, urlConnexion})
//   - password-changed    ({prenom})
//   - user-welcome        ({prenom, email, motDePasseInitial, urlConnexion})
//   - licence-expiring    ({reference, dateFin, joursRestants, urlLicence})
//   - volume-threshold    ({reference, articleCode, pourcentage, urlLicence})
// ==============================================================================

import mjml2html from "mjml";

import { ValidationError } from "@/server/modules/error";

import {
  TemplateRenderer,
  type EmailTemplateName,
  type RenderedTemplate,
} from "../../ports/template-renderer";

import {
  LICENCE_EXPIRING,
  PASSWORD_CHANGED,
  PASSWORD_RESET,
  USER_WELCOME,
  VOLUME_THRESHOLD,
} from "./templates";

interface TemplateDefinition {
  readonly subject: string;
  readonly mjml: string;
  readonly text: string;
}

const REGISTRY: Record<EmailTemplateName, TemplateDefinition> = {
  "password-reset": PASSWORD_RESET,
  "password-changed": PASSWORD_CHANGED,
  "user-welcome": USER_WELCOME,
  "licence-expiring": LICENCE_EXPIRING,
  "volume-threshold": VOLUME_THRESHOLD,
};

export class TemplateRendererMjml extends TemplateRenderer {
  render(
    template: EmailTemplateName,
    variables: Readonly<Record<string, string | number>>,
  ): RenderedTemplate {
    const def = REGISTRY[template];
    const subject = substitute(def.subject, variables);
    const text = substitute(def.text, variables);
    const mjmlSource = substitute(def.mjml, variables);
    const result = mjml2html(mjmlSource, { validationLevel: "soft" });
    if (result.errors.length > 0) {
      throw new ValidationError({
        code: "SPX-LIC-802",
        message: `MJML errors (template ${template}): ${result.errors.map((e) => e.message).join(", ")}`,
      });
    }
    return { subject, html: result.html, text };
  }
}

function substitute(source: string, variables: Readonly<Record<string, string | number>>): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined ? `{{${key}}}` : String(value);
  });
}
