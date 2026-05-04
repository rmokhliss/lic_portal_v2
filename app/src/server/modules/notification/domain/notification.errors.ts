// ==============================================================================
// LIC v2 — Erreurs notification (Phase 8.B)
// ==============================================================================

import { ForbiddenError, NotFoundError } from "@/server/modules/error";

export function notificationNotFoundById(id: string): NotFoundError {
  return new NotFoundError({
    code: "SPX-LIC-759",
    message: `Notification introuvable : id=${id}`,
    details: { id },
  });
}

export function notificationForbidden(id: string, userId: string): ForbiddenError {
  return new ForbiddenError({
    code: "SPX-LIC-760",
    message: `Notification ${id} appartient à un autre utilisateur`,
    details: { id, userId },
  });
}
