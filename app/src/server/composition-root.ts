// ==============================================================================
// LIC v2 — Composition root cross-module (F-07, étendu F-08, Phase 2.B 5/7)
//
// SEUL fichier autorisé par eslint boundaries à câbler les <X>.module.ts entre
// eux. Les <X>.module.ts restent fermés (DI intra-module). Le graphe de
// dépendances cross-module est concentré ici, auditable d'un coup d'œil.
//
// Deux rôles :
//   1. Câbler les use-cases qui ont besoin de plusieurs repos cross-module
//      (ex: ChangePasswordUseCase = user + audit).
//   2. Surface publique pour les Server Actions / jobs : ESLint contraint
//      `app-route → composition-root` (pas `→ module-root`), donc les
//      use-cases auto-suffisants doivent être ré-exportés depuis ici pour
//      être consommables côté UI.
//
// F-08 : option (b) strict — ChangePasswordUseCase reçoit auditRepository
// directement (PAS le use-case audit) pour éviter application → application
// cross-module. Les use-cases audit (record/search/getById) sont exposés ici
// pour les futures Server Actions Phase 11 (EC-06 Journal des modifications)
// mais NE SONT PAS injectés dans d'autres use-cases internes.
//
// Phase 2.B étape 5/7 : ré-exports des 30 use-cases des 6 référentiels SADMIN.
// Ces use-cases sont déjà instanciés dans leur <X>.module.ts (pas besoin de
// cross-module — exclus de l'audit obligatoire, cf. ADR 0017 + R-27).
// ==============================================================================

import { auditRepository } from "@/server/modules/audit/audit.module";
import { GetAuditEntryByIdUseCase } from "@/server/modules/audit/application/get-audit-entry-by-id.usecase";
import { RecordAuditEntryUseCase } from "@/server/modules/audit/application/record-audit-entry.usecase";
import { SearchAuditLogUseCase } from "@/server/modules/audit/application/search-audit-log.usecase";
import { ChangeClientStatusUseCase } from "@/server/modules/client/application/change-client-status.usecase";
import { CreateClientUseCase } from "@/server/modules/client/application/create-client.usecase";
import { UpdateClientUseCase } from "@/server/modules/client/application/update-client.usecase";
import { clientRepository } from "@/server/modules/client/client.module";
import { CreateContactUseCase } from "@/server/modules/contact/application/create-contact.usecase";
import { DeleteContactUseCase } from "@/server/modules/contact/application/delete-contact.usecase";
import { UpdateContactUseCase } from "@/server/modules/contact/application/update-contact.usecase";
import { contactRepository } from "@/server/modules/contact/contact.module";
import { CreateEntiteUseCase } from "@/server/modules/entite/application/create-entite.usecase";
import { ToggleEntiteActiveUseCase } from "@/server/modules/entite/application/toggle-entite-active.usecase";
import { UpdateEntiteUseCase } from "@/server/modules/entite/application/update-entite.usecase";
import { entiteRepository } from "@/server/modules/entite/entite.module";
import { ChangeLicenceStatusUseCase } from "@/server/modules/licence/application/change-licence-status.usecase";
import { CreateLicenceUseCase } from "@/server/modules/licence/application/create-licence.usecase";
import { UpdateLicenceUseCase } from "@/server/modules/licence/application/update-licence.usecase";
import { licenceRepository } from "@/server/modules/licence/licence.module";
import { AnnulerRenouvellementUseCase } from "@/server/modules/renouvellement/application/annuler-renouvellement.usecase";
import { CreateRenouvellementUseCase } from "@/server/modules/renouvellement/application/create-renouvellement.usecase";
import { UpdateRenouvellementUseCase } from "@/server/modules/renouvellement/application/update-renouvellement.usecase";
import { ValiderRenouvellementUseCase } from "@/server/modules/renouvellement/application/valider-renouvellement.usecase";
import { renouvellementRepository } from "@/server/modules/renouvellement/renouvellement.module";
import { ChangePasswordUseCase } from "@/server/modules/user/application/change-password.usecase";
import { CreateUserUseCase } from "@/server/modules/user/application/create-user.usecase";
import { ResetUserPasswordUseCase } from "@/server/modules/user/application/reset-user-password.usecase";
import { ToggleUserActiveUseCase } from "@/server/modules/user/application/toggle-user-active.usecase";
import { UpdateUserUseCase } from "@/server/modules/user/application/update-user.usecase";
import { userRepository } from "@/server/modules/user/user.module";

// --- F-07/F-08 : auth + audit ----------------------------------------------

// Use-case user qui orchestre user + audit dans une seule transaction (règle L3).
// Reçoit auditRepository directement (option (b) Stop #1 F-08).
export const changePasswordUseCase = new ChangePasswordUseCase(userRepository, auditRepository);

// --- Phase 2.B.bis EC-08 : 4 use-cases user mutateurs ----------------------
// Tous orchestrent user + audit dans une seule transaction (règle L3).
// Pattern F-08 option (b) : injection AuditRepository directe (pas du
// RecordAuditEntryUseCase) pour préserver l'isolation hexagonale.
// Le ListUsersUseCase est read-only et reste câblé dans user.module.ts
// (pas de dépendance audit). listUsersUseCase est ré-exporté plus bas.

export const createUserUseCase = new CreateUserUseCase(userRepository, auditRepository);
export const updateUserUseCase = new UpdateUserUseCase(userRepository, auditRepository);
export const toggleUserActiveUseCase = new ToggleUserActiveUseCase(userRepository, auditRepository);
export const resetUserPasswordUseCase = new ResetUserPasswordUseCase(
  userRepository,
  auditRepository,
);

export { listUsersUseCase } from "@/server/modules/user/user.module";

// Use-cases audit standalone — exposés pour Phase 11 EC-06 (Server Actions
// audit). Non câblés dans d'autres use-cases internes (option (b)).
export const recordAuditEntryUseCase = new RecordAuditEntryUseCase(auditRepository);
export const searchAuditLogUseCase = new SearchAuditLogUseCase(auditRepository);
export const getAuditEntryByIdUseCase = new GetAuditEntryByIdUseCase(auditRepository);

// --- Phase 2.B 5/7 : référentiels SADMIN (re-exports) ----------------------
//
// 30 use-cases au total (5 par module × 6 modules). Pas d'instanciation ici :
// chaque <X>.module.ts a déjà construit ses singletons. composition-root.ts
// ne fait que ré-exporter pour la surface app-route.

export {
  createRegionUseCase,
  getRegionUseCase,
  listRegionsUseCase,
  toggleRegionUseCase,
  updateRegionUseCase,
} from "@/server/modules/regions/regions.module";

export {
  createPaysUseCase,
  getPaysUseCase,
  listPaysUseCase,
  togglePaysUseCase,
  updatePaysUseCase,
} from "@/server/modules/pays/pays.module";

export {
  createDeviseUseCase,
  getDeviseUseCase,
  listDevisesUseCase,
  toggleDeviseUseCase,
  updateDeviseUseCase,
} from "@/server/modules/devises/devises.module";

export {
  createLangueUseCase,
  getLangueUseCase,
  listLanguesUseCase,
  toggleLangueUseCase,
  updateLangueUseCase,
} from "@/server/modules/langues/langues.module";

export {
  createTypeContactUseCase,
  getTypeContactUseCase,
  listTypesContactUseCase,
  toggleTypeContactUseCase,
  updateTypeContactUseCase,
} from "@/server/modules/types-contact/types-contact.module";

export {
  createTeamMemberUseCase,
  getTeamMemberUseCase,
  listTeamMembersUseCase,
  toggleTeamMemberUseCase,
  updateTeamMemberUseCase,
} from "@/server/modules/team-members/team-members.module";

// --- Phase 2.B 7/7 : settings (table technique, pas d'audit R-27) ----------

export {
  listSettingsUseCase,
  updateSettingsUseCase,
} from "@/server/modules/settings/settings.module";

// --- Phase 4 étape 4.B : module client (audit obligatoire — entité métier) -
// Pattern F-08 option (b) : injection AuditRepository directe + UserRepository
// pour résolution actor L9.
// Les use-cases read-only (get, list) sont câblés dans client.module.ts et
// ré-exportés ici pour la surface app-route.

export const createClientUseCase = new CreateClientUseCase(
  clientRepository,
  userRepository,
  auditRepository,
);
export const updateClientUseCase = new UpdateClientUseCase(
  clientRepository,
  userRepository,
  auditRepository,
);
export const changeClientStatusUseCase = new ChangeClientStatusUseCase(
  clientRepository,
  userRepository,
  auditRepository,
);

export { getClientUseCase, listClientsUseCase } from "@/server/modules/client/client.module";

// --- Phase 4 étape 4.C : modules entite + contact (audit obligatoire) ------

export const createEntiteUseCase = new CreateEntiteUseCase(
  entiteRepository,
  userRepository,
  auditRepository,
);
export const updateEntiteUseCase = new UpdateEntiteUseCase(
  entiteRepository,
  userRepository,
  auditRepository,
);
export const toggleEntiteActiveUseCase = new ToggleEntiteActiveUseCase(
  entiteRepository,
  userRepository,
  auditRepository,
);

export {
  getEntiteUseCase,
  listEntitesByClientUseCase,
} from "@/server/modules/entite/entite.module";

export const createContactUseCase = new CreateContactUseCase(
  contactRepository,
  userRepository,
  auditRepository,
);
export const updateContactUseCase = new UpdateContactUseCase(
  contactRepository,
  userRepository,
  auditRepository,
);
export const deleteContactUseCase = new DeleteContactUseCase(
  contactRepository,
  userRepository,
  auditRepository,
);

export {
  getContactUseCase,
  listContactsByEntiteUseCase,
} from "@/server/modules/contact/contact.module";

// --- Phase 5 : licences (audit obligatoire) ---------------------------------

export const createLicenceUseCase = new CreateLicenceUseCase(
  licenceRepository,
  userRepository,
  auditRepository,
);
export const updateLicenceUseCase = new UpdateLicenceUseCase(
  licenceRepository,
  userRepository,
  auditRepository,
);
export const changeLicenceStatusUseCase = new ChangeLicenceStatusUseCase(
  licenceRepository,
  userRepository,
  auditRepository,
);

export {
  getLicenceUseCase,
  listLicencesByClientUseCase,
} from "@/server/modules/licence/licence.module";

// --- Phase 5 : renouvellements (audit obligatoire) --------------------------

export const createRenouvellementUseCase = new CreateRenouvellementUseCase(
  renouvellementRepository,
  licenceRepository,
  userRepository,
  auditRepository,
);
export const validerRenouvellementUseCase = new ValiderRenouvellementUseCase(
  renouvellementRepository,
  userRepository,
  auditRepository,
);
export const annulerRenouvellementUseCase = new AnnulerRenouvellementUseCase(
  renouvellementRepository,
  userRepository,
  auditRepository,
);
export const updateRenouvellementUseCase = new UpdateRenouvellementUseCase(
  renouvellementRepository,
  userRepository,
  auditRepository,
);

export {
  getRenouvellementUseCase,
  listRenouvellementsByLicenceUseCase,
  searchRenouvellementsUseCase,
} from "@/server/modules/renouvellement/renouvellement.module";

// --- Phase 6 étape 6.B : catalogue produits + articles (R-27 sans audit) ---

export {
  createProduitUseCase,
  getProduitUseCase,
  listProduitsUseCase,
  toggleProduitUseCase,
  updateProduitUseCase,
} from "@/server/modules/produit/produit.module";

export {
  createArticleUseCase,
  getArticleUseCase,
  listArticlesUseCase,
  toggleArticleUseCase,
  updateArticleUseCase,
} from "@/server/modules/article/article.module";

// --- Phase 6 étape 6.C : liaisons licence-produit + licence-article --------
// Audit obligatoire — câblage ici avec userRepository + auditRepository.

import { articleRepository } from "@/server/modules/article/article.module";
import { AddArticleToLicenceUseCase } from "@/server/modules/licence-article/application/add-article-to-licence.usecase";
import { RemoveArticleFromLicenceUseCase } from "@/server/modules/licence-article/application/remove-article-from-licence.usecase";
import { UpdateArticleVolumeUseCase } from "@/server/modules/licence-article/application/update-article-volume.usecase";
import { licenceArticleRepository } from "@/server/modules/licence-article/licence-article.module";
import { AddProduitToLicenceUseCase } from "@/server/modules/licence-produit/application/add-produit-to-licence.usecase";
import { RemoveProduitFromLicenceUseCase } from "@/server/modules/licence-produit/application/remove-produit-from-licence.usecase";
import { licenceProduitRepository } from "@/server/modules/licence-produit/licence-produit.module";
import { produitRepository } from "@/server/modules/produit/produit.module";

export const addProduitToLicenceUseCase = new AddProduitToLicenceUseCase(
  licenceProduitRepository,
  licenceRepository,
  produitRepository,
  userRepository,
  auditRepository,
);
export const removeProduitFromLicenceUseCase = new RemoveProduitFromLicenceUseCase(
  licenceProduitRepository,
  userRepository,
  auditRepository,
);

export const addArticleToLicenceUseCase = new AddArticleToLicenceUseCase(
  licenceArticleRepository,
  licenceRepository,
  articleRepository,
  userRepository,
  auditRepository,
);
export const updateArticleVolumeUseCase = new UpdateArticleVolumeUseCase(
  licenceArticleRepository,
  userRepository,
  auditRepository,
);
export const removeArticleFromLicenceUseCase = new RemoveArticleFromLicenceUseCase(
  licenceArticleRepository,
  userRepository,
  auditRepository,
);

export { listProduitsByLicenceUseCase } from "@/server/modules/licence-produit/licence-produit.module";
export { listArticlesByLicenceUseCase } from "@/server/modules/licence-article/licence-article.module";

// --- Phase 6 étape 6.D : volume history (snapshots mensuels, pas d'audit) ---

export {
  listVolumeHistoryUseCase,
  recordVolumeSnapshotUseCase,
} from "@/server/modules/volume-history/volume-history.module";

// --- Phase 7 étape 7.A : audit-query (lecture seule, FTS + cursor + scope) --

export {
  exportAuditCsvUseCase,
  listAuditByClientScopeUseCase,
  listAuditByEntityUseCase,
  listAuditByLicenceScopeUseCase,
  searchAuditUseCase,
} from "@/server/modules/audit-query/audit-query.module";

// --- Phase 8 étape 8.B : alert-config (audit obligatoire) ------------------

import { CreateAlertConfigUseCase } from "@/server/modules/alert-config/application/create-alert-config.usecase";
import { DeleteAlertConfigUseCase } from "@/server/modules/alert-config/application/delete-alert-config.usecase";
import { UpdateAlertConfigUseCase } from "@/server/modules/alert-config/application/update-alert-config.usecase";
import { alertConfigRepository } from "@/server/modules/alert-config/alert-config.module";

export const createAlertConfigUseCase = new CreateAlertConfigUseCase(
  alertConfigRepository,
  userRepository,
  auditRepository,
);
export const updateAlertConfigUseCase = new UpdateAlertConfigUseCase(
  alertConfigRepository,
  userRepository,
  auditRepository,
);
export const deleteAlertConfigUseCase = new DeleteAlertConfigUseCase(
  alertConfigRepository,
  userRepository,
  auditRepository,
);

export { listAlertConfigsByClientUseCase } from "@/server/modules/alert-config/alert-config.module";

// --- Phase 8 étape 8.B : notifications (pas d'audit) ----------------------

export {
  createNotificationUseCase,
  deleteOldNotificationsUseCase,
  listNotificationsUseCase,
  markAllNotificationsReadUseCase,
  markNotificationReadUseCase,
} from "@/server/modules/notification/notification.module";

// --- Phase 10.B : fichier-log (append-only, pas d'audit DEC-019) -----------

export {
  listFichiersByLicenceUseCase,
  logFichierGenereUseCase,
  logHealthcheckImporteUseCase,
} from "@/server/modules/fichier-log/fichier-log.module";

// --- Phase 10.C : génération .lic (cross-module : licence + client + entite
// + licence-article + article + fichier-log). Pas d'audit (DEC-019). --------

import { articleRepository as articleRepoPhase10 } from "@/server/modules/article/article.module";
import { GenerateLicenceFichierUseCase } from "@/server/modules/fichier-log/application/generate-licence-fichier.usecase";
import { ImportHealthcheckUseCase } from "@/server/modules/fichier-log/application/import-healthcheck.usecase";
import {
  fichierLogRepository,
  logFichierGenereUseCase as logFichierGenereSingleton,
  logHealthcheckImporteUseCase as logHealthcheckImporteSingleton,
} from "@/server/modules/fichier-log/fichier-log.module";
import { licenceArticleRepository as licenceArticleRepoPhase10 } from "@/server/modules/licence-article/licence-article.module";

void fichierLogRepository;

export const generateLicenceFichierUseCase = new GenerateLicenceFichierUseCase(
  licenceRepository,
  clientRepository,
  entiteRepository,
  licenceArticleRepoPhase10,
  articleRepoPhase10,
  logFichierGenereSingleton,
);

// --- Phase 10.D : import healthcheck (cross-module : licence + article +
// licence-article + fichier-log + updateArticleVolumeUseCase) ---------------

export const importHealthcheckUseCase = new ImportHealthcheckUseCase(
  licenceRepository,
  articleRepoPhase10,
  licenceArticleRepoPhase10,
  updateArticleVolumeUseCase,
  logHealthcheckImporteSingleton,
);
