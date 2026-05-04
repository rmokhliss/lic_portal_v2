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
