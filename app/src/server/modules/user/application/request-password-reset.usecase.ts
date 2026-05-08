// ==============================================================================
// LIC v2 — RequestPasswordResetUseCase (Phase 24 — self-service forgot password)
//
// Flow auto-déclenché par l'utilisateur depuis /forgot-password (page
// publique non authentifiée) :
//   1. Cherche le user par email (silent si absent — anti-énumération).
//   2. Si user trouvé : appelle ResetUserPasswordUseCase avec SYSTEM_USER_ID
//      comme actor → génère un mot de passe temporaire + bump tokenVersion
//      + audit USER_PASSWORD_RESET_BY_ADMIN (mode JOB).
//   3. Envoie email PASSWORD_RESET avec le mot de passe temporaire au user.
//   4. Retourne toujours un Result success — l'UI affiche un message générique
//      indépendamment du résultat (anti-énumération).
//
// Distinct de ResetUserPasswordUseCase :
//   - Ce use-case wrap le reset + sendEmail (le caller admin reçoit
//     newPassword en clair pour PasswordRevealDialog ; ici on email seulement).
//   - Acteur = SYSTEM (l'user n'est pas authentifié au moment du reset).
//
// Sécurité :
//   - Anti-énumération : succès silencieux si email inconnu (aucun signal
//     observable côté attaquant pour différencier email valide/invalide).
//   - Le mot de passe temporaire transite par email — postulat sécurité aligné
//     sur le reset admin existant. Pas de signalement IP côté audit (pas
//     d'IP dans les use-cases backend, à logger côté Server Action si besoin).
// ==============================================================================

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import type { RenderTemplateUseCase } from "@/server/modules/email/application/render-template.usecase";
import type { SendEmailUseCase } from "@/server/modules/email/application/send-email.usecase";
import { createChildLogger } from "@/server/infrastructure/logger";

import type { UserRepository } from "../ports/user.repository";
import type { ResetUserPasswordUseCase } from "./reset-user-password.usecase";

const log = createChildLogger("user/request-password-reset");

export interface RequestPasswordResetInput {
  readonly email: string;
  /** URL absolue de la page de connexion (pour le lien dans l'email).
   *  Injectée par la Server Action depuis env / headers. */
  readonly loginUrl: string;
}

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetUserPasswordUseCase: ResetUserPasswordUseCase,
    private readonly renderTemplateUseCase: RenderTemplateUseCase,
    private readonly sendEmailUseCase: SendEmailUseCase,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.userRepository.findByEmail(input.email);
    if (user?.actif !== true) {
      // Anti-énumération : retour silencieux. Log Pino warn pour traçabilité.
      log.warn(
        { event: "request_password_reset_unknown_email", email: input.email },
        "Tentative de reset sur email inconnu/inactif (silent success)",
      );
      return;
    }

    const { newPassword } = await this.resetUserPasswordUseCase.execute(
      { userId: user.id },
      SYSTEM_USER_ID,
    );

    const rendered = this.renderTemplateUseCase.execute("password-reset", {
      prenom: user.prenom,
      motDePasseTemp: newPassword,
      urlConnexion: input.loginUrl,
    });

    try {
      await this.sendEmailUseCase.execute({
        to: user.email,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        bodyText: rendered.text,
      });
    } catch (err) {
      // Email failure post-reset : le mot de passe a été changé en BD mais
      // l'envoi mail a échoué. On log + on rethrow pour que le user voie une
      // erreur (sinon il pense que l'email arrive et perd son ancien mot de
      // passe sans recours). Le SADMIN peut alors forcer un re-reset manuel.
      log.error(
        { event: "request_password_reset_email_failed", userId: user.id },
        `Reset BD OK mais email échoué pour ${user.email}: ${err instanceof Error ? err.message : "?"}`,
      );
      throw err;
    }

    log.info(
      { event: "request_password_reset_ok", userId: user.id },
      `Mot de passe temporaire envoyé à ${user.email}`,
    );
  }
}
