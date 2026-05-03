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
  | "SPX-LIC-700"
  | "SPX-LIC-701"
  | "SPX-LIC-702"
  | "SPX-LIC-703"
  | "SPX-LIC-704"
  | "SPX-LIC-705"
  | "SPX-LIC-706"
  | "SPX-LIC-707"
  | "SPX-LIC-708"
  | "SPX-LIC-709"
  | "SPX-LIC-710"
  | "SPX-LIC-711"
  | "SPX-LIC-712"
  | "SPX-LIC-713"
  | "SPX-LIC-714"
  | "SPX-LIC-715"
  | "SPX-LIC-716"
  | "SPX-LIC-717"
  | "SPX-LIC-720"
  | "SPX-LIC-721"
  | "SPX-LIC-722"
  | "SPX-LIC-723"
  | "SPX-LIC-724"
  | "SPX-LIC-725"
  | "SPX-LIC-726"
  | "SPX-LIC-727"
  | "SPX-LIC-728"
  | "SPX-LIC-730"
  | "SPX-LIC-731"
  | "SPX-LIC-732"
  | "SPX-LIC-733"
  | "SPX-LIC-734"
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

  // --- Settings + utilisateurs + référentiels (700-799) --------------------
  // Phase 2.B étape 2/7 : module regions (référentiel paramétrable). Pattern
  // répliqué pour pays/devises/langues/types-contact/team-members aux étapes
  // suivantes — codes équivalents alloués au fur et à mesure dans la même range.
  "SPX-LIC-700": {
    code: "SPX-LIC-700",
    httpStatus: 404,
    defaultMessage: "Région introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-701": {
    code: "SPX-LIC-701",
    httpStatus: 409,
    defaultMessage: "Code région déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-702": {
    code: "SPX-LIC-702",
    httpStatus: 400,
    defaultMessage: "Données région invalides",
    className: "ValidationError",
  },
  "SPX-LIC-703": {
    code: "SPX-LIC-703",
    httpStatus: 404,
    defaultMessage: "Pays introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-704": {
    code: "SPX-LIC-704",
    httpStatus: 409,
    defaultMessage: "Code pays déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-705": {
    code: "SPX-LIC-705",
    httpStatus: 400,
    defaultMessage: "Données pays invalides",
    className: "ValidationError",
  },
  "SPX-LIC-706": {
    code: "SPX-LIC-706",
    httpStatus: 404,
    defaultMessage: "Devise introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-707": {
    code: "SPX-LIC-707",
    httpStatus: 409,
    defaultMessage: "Code devise déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-708": {
    code: "SPX-LIC-708",
    httpStatus: 400,
    defaultMessage: "Données devise invalides",
    className: "ValidationError",
  },
  "SPX-LIC-709": {
    code: "SPX-LIC-709",
    httpStatus: 404,
    defaultMessage: "Langue introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-710": {
    code: "SPX-LIC-710",
    httpStatus: 409,
    defaultMessage: "Code langue déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-711": {
    code: "SPX-LIC-711",
    httpStatus: 400,
    defaultMessage: "Données langue invalides",
    className: "ValidationError",
  },
  "SPX-LIC-712": {
    code: "SPX-LIC-712",
    httpStatus: 404,
    defaultMessage: "Type de contact introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-713": {
    code: "SPX-LIC-713",
    httpStatus: 409,
    defaultMessage: "Code type de contact déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-714": {
    code: "SPX-LIC-714",
    httpStatus: 400,
    defaultMessage: "Données type de contact invalides",
    className: "ValidationError",
  },
  "SPX-LIC-715": {
    code: "SPX-LIC-715",
    httpStatus: 404,
    defaultMessage: "Membre d'équipe introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-716": {
    code: "SPX-LIC-716",
    httpStatus: 409,
    defaultMessage: "Identité de membre déjà utilisée",
    className: "ConflictError",
  },
  "SPX-LIC-717": {
    code: "SPX-LIC-717",
    httpStatus: 400,
    defaultMessage: "Données membre d'équipe invalides",
    className: "ValidationError",
  },

  // --- Utilisateurs back-office EC-08 (720-729) -----------------------------
  // 718-719 réservés (extension future référentiels paramétrables).
  "SPX-LIC-720": {
    code: "SPX-LIC-720",
    httpStatus: 404,
    defaultMessage: "Utilisateur introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-721": {
    code: "SPX-LIC-721",
    httpStatus: 409,
    defaultMessage: "Identifiant utilisateur déjà utilisé (matricule ou email)",
    className: "ConflictError",
  },
  "SPX-LIC-722": {
    code: "SPX-LIC-722",
    httpStatus: 400,
    defaultMessage: "Données utilisateur invalides",
    className: "ValidationError",
  },
  "SPX-LIC-723": {
    code: "SPX-LIC-723",
    httpStatus: 409,
    defaultMessage: "Un administrateur ne peut pas se désactiver lui-même",
    className: "ConflictError",
  },

  // --- Clients EC-Clients Phase 4 (724-729) ---------------------------------
  // 729 réservé (extension future module client / entité / contact).
  "SPX-LIC-724": {
    code: "SPX-LIC-724",
    httpStatus: 404,
    defaultMessage: "Client introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-725": {
    code: "SPX-LIC-725",
    httpStatus: 409,
    defaultMessage: "Code client déjà utilisé",
    className: "ConflictError",
  },
  "SPX-LIC-726": {
    code: "SPX-LIC-726",
    httpStatus: 400,
    defaultMessage: "Données client invalides",
    className: "ValidationError",
  },
  "SPX-LIC-727": {
    code: "SPX-LIC-727",
    httpStatus: 409,
    defaultMessage: "Transition de statut client interdite",
    className: "ConflictError",
  },
  "SPX-LIC-728": {
    code: "SPX-LIC-728",
    httpStatus: 409,
    defaultMessage: "Conflit de version client (modification concurrente)",
    className: "ConflictError",
  },

  // --- Entites EC-Clients Phase 4.C (730-732) -------------------------------
  // 729 réservé.
  "SPX-LIC-730": {
    code: "SPX-LIC-730",
    httpStatus: 404,
    defaultMessage: "Entité introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-731": {
    code: "SPX-LIC-731",
    httpStatus: 409,
    defaultMessage: "Une entité avec ce nom existe déjà pour ce client",
    className: "ConflictError",
  },
  "SPX-LIC-732": {
    code: "SPX-LIC-732",
    httpStatus: 400,
    defaultMessage: "Données entité invalides",
    className: "ValidationError",
  },

  // --- Contacts EC-Clients Phase 4.C (733-734) ------------------------------
  "SPX-LIC-733": {
    code: "SPX-LIC-733",
    httpStatus: 404,
    defaultMessage: "Contact introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-734": {
    code: "SPX-LIC-734",
    httpStatus: 400,
    defaultMessage: "Données contact invalides",
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
