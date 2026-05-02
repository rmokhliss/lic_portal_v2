// ==============================================================================
// LIC v2 — Composition root cross-module (F-07, étendu F-08)
//
// SEUL fichier autorisé par eslint boundaries à câbler les <X>.module.ts entre
// eux. Les <X>.module.ts restent fermés (DI intra-module). Le graphe de
// dépendances cross-module est concentré ici, auditable d'un coup d'œil.
//
// Surface publique : uniquement les use-cases câblés (pas les modules ni les
// repositories). Les Server Actions et les jobs importent depuis ce fichier
// uniquement.
//
// F-08 : option (b) strict — ChangePasswordUseCase reçoit auditRepository
// directement (PAS le use-case audit) pour éviter application → application
// cross-module. Les use-cases audit (record/search/getById) sont exposés ici
// pour les futures Server Actions Phase 11 (EC-06 Journal des modifications)
// mais NE SONT PAS injectés dans d'autres use-cases internes.
// ==============================================================================

import { auditRepository } from "@/server/modules/audit/audit.module";
import { GetAuditEntryByIdUseCase } from "@/server/modules/audit/application/get-audit-entry-by-id.usecase";
import { RecordAuditEntryUseCase } from "@/server/modules/audit/application/record-audit-entry.usecase";
import { SearchAuditLogUseCase } from "@/server/modules/audit/application/search-audit-log.usecase";
import { ChangePasswordUseCase } from "@/server/modules/user/application/change-password.usecase";
import { userRepository } from "@/server/modules/user/user.module";

// Use-case user qui orchestre user + audit dans une seule transaction (règle L3).
// Reçoit auditRepository directement (option (b) Stop #1 F-08).
export const changePasswordUseCase = new ChangePasswordUseCase(userRepository, auditRepository);

// Use-cases audit standalone — exposés pour Phase 11 EC-06 (Server Actions
// audit). Non câblés dans d'autres use-cases internes (option (b)).
export const recordAuditEntryUseCase = new RecordAuditEntryUseCase(auditRepository);
export const searchAuditLogUseCase = new SearchAuditLogUseCase(auditRepository);
export const getAuditEntryByIdUseCase = new GetAuditEntryByIdUseCase(auditRepository);
