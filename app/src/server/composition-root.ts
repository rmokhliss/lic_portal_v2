// ==============================================================================
// LIC v2 — Composition root cross-module (F-07)
//
// SEUL fichier autorisé par eslint boundaries à câbler les <X>.module.ts entre
// eux. Les <X>.module.ts restent fermés (DI intra-module). Le graphe de
// dépendances cross-module est concentré ici, auditable d'un coup d'œil.
//
// Surface publique : uniquement les use-cases câblés (pas les modules ni les
// repositories). Les Server Actions et les jobs importent depuis ce fichier
// uniquement.
//
// F-08+ : étendre ce fichier avec d'autres use-cases câblés au fur et à mesure
// que les modules se construisent (createClient, generateLicence, etc.).
// ==============================================================================

import { auditRecorder } from "@/server/modules/audit/audit.module";
import { ChangePasswordUseCase } from "@/server/modules/user/application/change-password.usecase";
import { userRepository } from "@/server/modules/user/user.module";

export const changePasswordUseCase = new ChangePasswordUseCase(userRepository, auditRecorder);
