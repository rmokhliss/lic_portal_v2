// ==============================================================================
// LIC v2 — Adapter EmailSender Console (Phase 14 — DETTE-003)
//
// Mode simulé : log Pino INFO de la payload (dest, sujet, premiers 200 car).
// Activé quand `env.SMTP_HOST` absent (dev/test/preview). Aucun envoi réel,
// idéal pour smoke tests sans MTA dispo.
// ==============================================================================

import { createChildLogger } from "@/server/infrastructure/logger";

import type { EmailMessage } from "../../domain/email-message.entity";
import { EmailSender } from "../../ports/email-sender";

const log = createChildLogger("email/console");

export class EmailSenderConsole extends EmailSender {
  readonly mode = "console" as const;

  send(message: EmailMessage): Promise<void> {
    log.info(
      {
        to: message.to,
        from: message.from,
        subject: message.subject,
        bodyTextPreview: message.bodyText.slice(0, 200),
        bodyHtmlBytes: message.bodyHtml.length,
      },
      "Email simulé (console adapter — SMTP_HOST absent)",
    );
    return Promise.resolve();
  }
}
