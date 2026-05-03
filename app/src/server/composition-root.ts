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
import { ChangePasswordUseCase } from "@/server/modules/user/application/change-password.usecase";
import { userRepository } from "@/server/modules/user/user.module";

// --- F-07/F-08 : auth + audit ----------------------------------------------

// Use-case user qui orchestre user + audit dans une seule transaction (règle L3).
// Reçoit auditRepository directement (option (b) Stop #1 F-08).
export const changePasswordUseCase = new ChangePasswordUseCase(userRepository, auditRepository);

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
