// ==============================================================================
// LIC v2 — Composition root du module email (Phase 14 — DETTE-003)
//
// Sélection adapter selon env :
//   - env.SMTP_HOST défini → EmailSenderSmtp (nodemailer transport réel)
//   - sinon → EmailSenderConsole (mode simulé, logs Pino)
//
// Pas d'audit cross-module : l'envoi d'email est un effet de bord, traçabilité
// portée par les logs Pino + les use-cases métier qui appellent SendEmail.
// ==============================================================================

import { env } from "@/server/infrastructure/env";

import { EmailSenderConsole } from "./adapters/console/email-sender.console";
import { EmailSenderSmtp } from "./adapters/smtp/email-sender.smtp";
import { TemplateRendererMjml } from "./adapters/mjml/template-renderer.mjml";
import { RenderTemplateUseCase } from "./application/render-template.usecase";
import { SendEmailUseCase } from "./application/send-email.usecase";
import type { EmailSender } from "./ports/email-sender";

function buildSender(): EmailSender {
  if (env.SMTP_HOST !== undefined && env.SMTP_HOST.length > 0) {
    return new EmailSenderSmtp({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      ...(env.SMTP_USER !== undefined ? { user: env.SMTP_USER } : {}),
      ...(env.SMTP_PASSWORD !== undefined ? { password: env.SMTP_PASSWORD } : {}),
      from: env.SMTP_FROM ?? "no-reply@s2m-lic.local",
      secure: env.SMTP_SECURE,
    });
  }
  return new EmailSenderConsole();
}

export const emailSender: EmailSender = buildSender();
export const templateRenderer = new TemplateRendererMjml();
export const sendEmailUseCase = new SendEmailUseCase(emailSender);
export const renderTemplateUseCase = new RenderTemplateUseCase(templateRenderer);

/** Statut courant pour /settings/smtp — affichage UI lecture seule. */
export function getEmailStatus(): {
  readonly mode: "smtp" | "console";
  readonly host: string | null;
  readonly port: number | null;
  readonly from: string | null;
} {
  return {
    mode: emailSender.mode,
    host: env.SMTP_HOST ?? null,
    port: emailSender.mode === "smtp" ? env.SMTP_PORT : null,
    from: env.SMTP_FROM ?? null,
  };
}
