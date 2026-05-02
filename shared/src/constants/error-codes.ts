// ==============================================================================
// LIC v2 — Catalogue des codes erreur SPX-LIC-NNN (Référentiel §4.2 + Annexe A)
//
// Source de vérité UI ↔ serveur. Importable côté serveur (Node) ET côté bundle
// client (pas d'API Node-only ici). Le module typé app/src/server/modules/error/
// consomme ce catalogue pour construire ses sous-classes d'AppError.
//
// Ranges (CLAUDE.md §4) :
//   001-099 : auth + sessions
//   100-199 : clients + entités
//   200-299 : licences + produits + articles
//   300-399 : volumes + alertes + healthcheck
//   400-499 : crypto + PKI + sandbox
//   500-599 : audit + journal + notifications
//   600-699 : renouvellements + rapports
//   700-799 : settings + utilisateurs + référentiels
//   900-999 : système, jobs, batchs et erreurs génériques transverses
// ==============================================================================

export type ErrorCode =
  | "SPX-LIC-001"
  | "SPX-LIC-002"
  | "SPX-LIC-003"
  | "SPX-LIC-500"
  | "SPX-LIC-501"
  | "SPX-LIC-502"
  | "SPX-LIC-900"
  | "SPX-LIC-901"
  | "SPX-LIC-902"
  | "SPX-LIC-903"
  | "SPX-LIC-904";

export type ErrorClassName =
  | "NotFoundError"
  | "ValidationError"
  | "UnauthorizedError"
  | "ForbiddenError"
  | "ConflictError"
  | "RateLimitError"
  | "InternalError";

export interface ErrorCodeEntry {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly defaultMessage: string;
  readonly className: ErrorClassName;
}

export const ERROR_CATALOGUE: Readonly<Record<ErrorCode, ErrorCodeEntry>> = {
  // --- Auth + sessions (001-099) -------------------------------------------
  "SPX-LIC-001": {
    code: "SPX-LIC-001",
    httpStatus: 401,
    defaultMessage: "Session expirée ou inexistante",
    className: "UnauthorizedError",
  },
  "SPX-LIC-002": {
    code: "SPX-LIC-002",
    httpStatus: 401,
    defaultMessage: "Identifiants invalides",
    className: "UnauthorizedError",
  },
  "SPX-LIC-003": {
    code: "SPX-LIC-003",
    httpStatus: 403,
    defaultMessage: "Rôle insuffisant pour cette action",
    className: "ForbiddenError",
  },

  // --- Audit + journal + notifications (500-599) ---------------------------
  "SPX-LIC-500": {
    code: "SPX-LIC-500",
    httpStatus: 400,
    defaultMessage: "Données d'audit invalides",
    className: "ValidationError",
  },
  "SPX-LIC-501": {
    code: "SPX-LIC-501",
    httpStatus: 404,
    defaultMessage: "Entrée d'audit introuvable",
    className: "NotFoundError",
  },
  // SPX-LIC-502 : co-localisé audit pour l'instant. À extraire en code générique
  // pagination quand le helper cursor.ts servira d'autres modules (F-09+).
  "SPX-LIC-502": {
    code: "SPX-LIC-502",
    httpStatus: 400,
    defaultMessage: "Cursor de pagination invalide",
    className: "ValidationError",
  },

  // --- Système + erreurs génériques transverses (900-999) ------------------
  "SPX-LIC-900": {
    code: "SPX-LIC-900",
    httpStatus: 500,
    defaultMessage: "Erreur interne du serveur",
    className: "InternalError",
  },
  "SPX-LIC-901": {
    code: "SPX-LIC-901",
    httpStatus: 400,
    defaultMessage: "Données fournies invalides",
    className: "ValidationError",
  },
  "SPX-LIC-902": {
    code: "SPX-LIC-902",
    httpStatus: 404,
    defaultMessage: "Ressource introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-903": {
    code: "SPX-LIC-903",
    httpStatus: 409,
    defaultMessage: "Conflit détecté avec l'état actuel de la ressource",
    className: "ConflictError",
  },
  "SPX-LIC-904": {
    code: "SPX-LIC-904",
    httpStatus: 429,
    defaultMessage: "Trop de requêtes, veuillez réessayer plus tard",
    className: "RateLimitError",
  },
};

// ==============================================================================
// Type guard cross-realm safe
//
// Duck-typing sur `__isAppError === true` plutôt que `instanceof AppError` :
//   - robuste à la duplication de module (bundles client vs serveur)
//   - utilisable côté UI sans dépendance à la classe AppError (server-only)
// ==============================================================================

export interface AppErrorShape {
  readonly __isAppError: true;
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export function isAppError(value: unknown): value is AppErrorShape {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.__isAppError === true &&
    typeof v.code === "string" &&
    typeof v.httpStatus === "number" &&
    typeof v.message === "string"
  );
}
