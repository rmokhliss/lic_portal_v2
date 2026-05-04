// ==============================================================================
// LIC v2 — Catalogue statique des actions d'audit (Phase 7)
//
// Liste fermée des actions émises par les use-cases mutateurs Phase 4-6.
// Sert au filtre <select> de l'UI Historique. Statique pour éviter une
// requête DISTINCT lente sur lic_audit_log à chaque render. À tenir à jour
// quand on ajoute un nouveau verbe d'audit.
// ==============================================================================

export const AUDIT_ACTIONS_CATALOG: readonly string[] = [
  // Phase 4 — clients
  "CLIENT_CREATED",
  "CLIENT_UPDATED",
  "CLIENT_STATUS_CHANGED",
  // Phase 4 — entites + contacts
  "ENTITE_CREATED",
  "ENTITE_UPDATED",
  "ENTITE_ACTIVATED",
  "ENTITE_DEACTIVATED",
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "CONTACT_DELETED",
  // Phase 5 — licences + renouvellements
  "LICENCE_CREATED",
  "LICENCE_UPDATED",
  "LICENCE_ACTIVATED",
  "LICENCE_DEACTIVATED",
  "LICENCE_REACTIVATED",
  "LICENCE_SUSPENDED",
  "LICENCE_EXPIRED",
  "LICENCE_EXPIRED_BY_JOB",
  "RENOUVELLEMENT_CREATED",
  "RENOUVELLEMENT_UPDATED",
  "RENOUVELLEMENT_VALIDATED",
  "RENOUVELLEMENT_CANCELLED",
  // Phase 6 — liaisons licence-produit / licence-article
  "LICENCE_PRODUIT_ADDED",
  "LICENCE_PRODUIT_REMOVED",
  "LICENCE_ARTICLE_ADDED",
  "LICENCE_ARTICLE_VOLUME_UPDATED",
  "LICENCE_ARTICLE_REMOVED",
  // F-08 — users
  "USER_CREATED",
  "USER_UPDATED",
  "USER_ROLE_CHANGED",
  "USER_ACTIVATED",
  "USER_DEACTIVATED",
  "USER_PASSWORD_RESET_BY_ADMIN",
  "USER_PASSWORD_CHANGED",
];
