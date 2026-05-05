// ==============================================================================
// LIC v2 — Port EmailSender (Phase 14 — DETTE-003)
//
// Surface 1 méthode : `send(message)`. Implémentations :
//   - SMTP (nodemailer) — si env.SMTP_HOST défini (prod)
//   - Console (Pino logs) — fallback dev/test (mode simulé)
//
// Le sélecteur d'adapter est dans `email.module.ts`.
// ==============================================================================

import type { EmailMessage } from "../domain/email-message.entity";

export abstract class EmailSender {
  /** Mode courant — "smtp" ou "console". Lecture seule, exposé pour /settings/smtp. */
  abstract readonly mode: "smtp" | "console";

  /** Throw `SPX-LIC-800` (InternalError) si l'envoi échoue côté transport. */
  abstract send(message: EmailMessage): Promise<void>;
}
