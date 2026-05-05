// ==============================================================================
// LIC v2 — Registre des templates email MJML (Phase 14 — DETTE-003)
//
// Chaque template = { subject, mjml, text }. La substitution {{var}} est
// effectuée par le renderer avant compilation MJML. La version texte est
// fournie en clair (pas de strip MJML) — fallback clients sans HTML.
// ==============================================================================

const wrap = (title: string, content: string): string => `
<mjml>
  <mj-head>
    <mj-title>${title}</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>${content}</mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export const PASSWORD_RESET = {
  subject: "Réinitialisation de votre mot de passe — Portail Licences SELECT-PX",
  mjml: wrap(
    "Réinitialisation mot de passe",
    `
    <mj-text font-size="16px"><b>Bonjour {{prenom}},</b></mj-text>
    <mj-text>Votre mot de passe a été réinitialisé par un administrateur.</mj-text>
    <mj-text>Mot de passe temporaire : <b>{{motDePasseTemp}}</b></mj-text>
    <mj-text>Vous devrez le changer à votre prochaine connexion.</mj-text>
    <mj-button href="{{urlConnexion}}">Se connecter</mj-button>
    `,
  ),
  text: `Bonjour {{prenom}},

Votre mot de passe a été réinitialisé par un administrateur.
Mot de passe temporaire : {{motDePasseTemp}}
Vous devrez le changer à votre prochaine connexion.

Se connecter : {{urlConnexion}}
`,
};

export const PASSWORD_CHANGED = {
  subject: "Votre mot de passe a été modifié",
  mjml: wrap(
    "Mot de passe modifié",
    `
    <mj-text font-size="16px"><b>Bonjour {{prenom}},</b></mj-text>
    <mj-text>Votre mot de passe vient d'être modifié sur le Portail Licences SELECT-PX.</mj-text>
    <mj-text>Si vous n'êtes pas à l'origine de cette action, contactez immédiatement un administrateur.</mj-text>
    `,
  ),
  text: `Bonjour {{prenom}},

Votre mot de passe vient d'être modifié sur le Portail Licences SELECT-PX.
Si vous n'êtes pas à l'origine de cette action, contactez immédiatement un administrateur.
`,
};

export const USER_WELCOME = {
  subject: "Bienvenue sur le Portail Licences SELECT-PX",
  mjml: wrap(
    "Bienvenue",
    `
    <mj-text font-size="16px"><b>Bonjour {{prenom}},</b></mj-text>
    <mj-text>Votre compte a été créé sur le Portail Licences SELECT-PX.</mj-text>
    <mj-text>Identifiant : <b>{{email}}</b></mj-text>
    <mj-text>Mot de passe initial : <b>{{motDePasseInitial}}</b></mj-text>
    <mj-text>Vous devrez le changer à votre première connexion.</mj-text>
    <mj-button href="{{urlConnexion}}">Se connecter</mj-button>
    `,
  ),
  text: `Bonjour {{prenom}},

Votre compte a été créé sur le Portail Licences SELECT-PX.
Identifiant : {{email}}
Mot de passe initial : {{motDePasseInitial}}
Vous devrez le changer à votre première connexion.

Se connecter : {{urlConnexion}}
`,
};

export const LICENCE_EXPIRING = {
  subject: "Licence {{reference}} expire dans {{joursRestants}} jours",
  mjml: wrap(
    "Licence en expiration",
    `
    <mj-text font-size="16px"><b>Alerte expiration licence</b></mj-text>
    <mj-text>La licence <b>{{reference}}</b> expire le <b>{{dateFin}}</b> ({{joursRestants}} jours restants).</mj-text>
    <mj-text>Pensez à initier le renouvellement.</mj-text>
    <mj-button href="{{urlLicence}}">Voir la licence</mj-button>
    `,
  ),
  text: `Alerte expiration licence

La licence {{reference}} expire le {{dateFin}} ({{joursRestants}} jours restants).
Pensez à initier le renouvellement.

Voir la licence : {{urlLicence}}
`,
};

export const VOLUME_THRESHOLD = {
  subject: "Seuil volume atteint — Licence {{reference}} ({{pourcentage}}%)",
  mjml: wrap(
    "Seuil volume",
    `
    <mj-text font-size="16px"><b>Alerte seuil volume</b></mj-text>
    <mj-text>L'article <b>{{articleCode}}</b> de la licence <b>{{reference}}</b> a atteint <b>{{pourcentage}}%</b> du volume autorisé.</mj-text>
    <mj-button href="{{urlLicence}}">Voir la licence</mj-button>
    `,
  ),
  text: `Alerte seuil volume

L'article {{articleCode}} de la licence {{reference}} a atteint {{pourcentage}}% du volume autorisé.

Voir la licence : {{urlLicence}}
`,
};
