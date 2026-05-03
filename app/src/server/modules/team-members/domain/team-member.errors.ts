// ==============================================================================
// LIC v2 — Erreurs typées du module team-members (Phase 2.B étape 4/7)
//
// Range 700-799 :
//   - SPX-LIC-715 TeamMemberNotFound (NotFoundError 404)
//   - SPX-LIC-716 (ConflictError 409, réservé pour future unicité éventuelle)
//   - SPX-LIC-717 Validation (centralisée dans team-member.entity.ts)
// ==============================================================================

import { NotFoundError } from "@/server/modules/error";

export function teamMemberNotFoundById(id: number): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-715",
    message: `Membre d'équipe introuvable : id=${String(id)}`,
    details: { id },
  });
}
