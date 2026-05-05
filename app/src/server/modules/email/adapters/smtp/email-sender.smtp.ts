// ==============================================================================
// LIC v2 — Adapter EmailSender SMTP (Phase 14 — DETTE-003)
//
// Wrapper nodemailer createTransport. Configuration injectée via constructor
// (le module sélectionne smtp vs console selon env). Pas de pool — volume
// faible attendu (≤200 emails/jour). Throw SPX-LIC-800 si transport échoue.
// ==============================================================================

import nodemailer, { type Transporter } from "nodemailer";

import { InternalError } from "@/server/modules/error";

import type { EmailMessage } from "../../domain/email-message.entity";
import { EmailSender } from "../../ports/email-sender";

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user?: string;
  readonly password?: string;
  readonly from: string;
  readonly secure: boolean;
}

export class EmailSenderSmtp extends EmailSender {
  readonly mode = "smtp" as const;
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(config: SmtpConfig) {
    super();
    this.defaultFrom = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user !== undefined && config.password !== undefined
          ? { user: config.user, pass: config.password }
          : undefined,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: message.from ?? this.defaultFrom,
        to: message.to,
        subject: message.subject,
        text: message.bodyText,
        html: message.bodyHtml,
      });
    } catch (err) {
      throw new InternalError({
        code: "SPX-LIC-800",
        message: `SMTP send échoué : ${err instanceof Error ? err.message : "unknown"}`,
        cause: err,
      });
    }
  }
}
