// ==============================================================================
// LIC v2 — Entité EmailMessage (Phase 14 — DETTE-003)
//
// Domaine pur : validation des destinataires + sujet + corps. Pas d'I/O,
// pas de dépendance Drizzle/nodemailer/Zod. Utilisé par tous les use-cases
// d'envoi (reset password, welcome, alertes, renouvellements).
// ==============================================================================

import { ValidationError } from "@/server/modules/error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUBJECT_MAX_LEN = 300;
const BODY_MAX_LEN = 1_000_000; // 1 MB texte

export interface EmailMessageProps {
  readonly to: string;
  readonly subject: string;
  /** Corps HTML rendu — déjà compilé MJML → HTML par le template renderer. */
  readonly bodyHtml: string;
  /** Corps texte brut alternatif — fallback clients sans HTML. */
  readonly bodyText: string;
  /** Override `from` (sinon EmailSender utilise env.SMTP_FROM). */
  readonly from?: string;
}

export class EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly bodyHtml: string;
  readonly bodyText: string;
  readonly from: string | null;

  private constructor(props: EmailMessageProps) {
    this.to = props.to;
    this.subject = props.subject;
    this.bodyHtml = props.bodyHtml;
    this.bodyText = props.bodyText;
    this.from = props.from ?? null;
  }

  static create(props: EmailMessageProps): EmailMessage {
    EmailMessage.validateAddress(props.to, "to");
    if (props.from !== undefined) {
      EmailMessage.validateAddress(props.from, "from");
    }
    EmailMessage.validateSubject(props.subject);
    EmailMessage.validateBody(props.bodyText, "bodyText");
    EmailMessage.validateBody(props.bodyHtml, "bodyHtml");
    return new EmailMessage(props);
  }

  static validateAddress(value: string, field: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: `Email ${field} obligatoire`,
      });
    }
    if (!EMAIL_REGEX.test(value)) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: `Email ${field} "${value}" invalide`,
      });
    }
  }

  static validateSubject(subject: string): void {
    if (typeof subject !== "string" || subject.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: "Sujet email obligatoire",
      });
    }
    if (subject.length > SUBJECT_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: `Sujet email > ${String(SUBJECT_MAX_LEN)} caractères`,
      });
    }
  }

  static validateBody(body: string, field: string): void {
    if (typeof body !== "string" || body.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: `${field} obligatoire`,
      });
    }
    if (body.length > BODY_MAX_LEN) {
      throw new ValidationError({
        code: "SPX-LIC-801",
        message: `${field} > ${String(BODY_MAX_LEN)} caractères`,
      });
    }
  }
}
