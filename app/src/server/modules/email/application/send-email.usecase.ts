// ==============================================================================
// LIC v2 — SendEmailUseCase (Phase 14 — DETTE-003)
//
// Orchestration : valide le message via EmailMessage.create + délègue
// l'envoi à l'adapter (smtp ou console). Pas d'audit cross-module — l'envoi
// d'email est un effet de bord transverse.
// ==============================================================================

import { EmailMessage, type EmailMessageProps } from "../domain/email-message.entity";
import type { EmailSender } from "../ports/email-sender";

export class SendEmailUseCase {
  constructor(private readonly sender: EmailSender) {}

  async execute(input: EmailMessageProps): Promise<void> {
    const message = EmailMessage.create(input);
    await this.sender.send(message);
  }
}
