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
  | "SPX-LIC-400"
  | "SPX-LIC-401"
  | "SPX-LIC-402"
  | "SPX-LIC-403"
  | "SPX-LIC-410"
  | "SPX-LIC-411"
  | "SPX-LIC-420"
  | "SPX-LIC-421"
  | "SPX-LIC-422"
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
  | "SPX-LIC-735"
  | "SPX-LIC-736"
  | "SPX-LIC-737"
  | "SPX-LIC-738"
  | "SPX-LIC-739"
  | "SPX-LIC-740"
  | "SPX-LIC-741"
  | "SPX-LIC-742"
  | "SPX-LIC-743"
  | "SPX-LIC-744"
  | "SPX-LIC-745"
  | "SPX-LIC-746"
  | "SPX-LIC-747"
  | "SPX-LIC-748"
  | "SPX-LIC-749"
  | "SPX-LIC-750"
  | "SPX-LIC-751"
  | "SPX-LIC-752"
  | "SPX-LIC-753"
  | "SPX-LIC-754"
  | "SPX-LIC-755"
  | "SPX-LIC-756"
  | "SPX-LIC-757"
  | "SPX-LIC-758"
  | "SPX-LIC-759"
  | "SPX-LIC-760"
  | "SPX-LIC-800"
  | "SPX-LIC-801"
  | "SPX-LIC-802"
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

  // --- Crypto + PKI + sandbox (400-499) ------------------------------------
  // Phase 3.A.1 : RSA primitives (signature/vérification SHA-256, RFC8017 §8.2).
  // Codes alloués au fur et à mesure des sous-étapes 3.A → 3.G.
  "SPX-LIC-400": {
    code: "SPX-LIC-400",
    httpStatus: 400,
    defaultMessage: "Signature invalide ou corrompue",
    className: "ValidationError",
  },
  "SPX-LIC-401": {
    code: "SPX-LIC-401",
    httpStatus: 400,
    defaultMessage: "Échec décodage clé RSA",
    className: "ValidationError",
  },
  // Phase 3.A.2 : AES-256-GCM (NIST SP800-38D).
  "SPX-LIC-402": {
    code: "SPX-LIC-402",
    httpStatus: 400,
    defaultMessage: "Échec déchiffrement AES-GCM (tag invalide ou format altéré)",
    className: "ValidationError",
  },
  "SPX-LIC-403": {
    code: "SPX-LIC-403",
    httpStatus: 400,
    defaultMessage: "Clé AES-256 invalide",
    className: "ValidationError",
  },
  // Phase 3.A.2+ : CA management (allocations partielles — 410 utilisé en 3.C).
  "SPX-LIC-410": {
    code: "SPX-LIC-410",
    httpStatus: 409,
    defaultMessage: "CA S2M déjà existante",
    className: "ConflictError",
  },
  "SPX-LIC-411": {
    code: "SPX-LIC-411",
    httpStatus: 400,
    defaultMessage: "CA S2M absente ou clé privée CA invalide",
    className: "ValidationError",
  },
  // Phase 3.A.2+ : certificats clients (420 utilisé en 3.D, 421/422 en 3.D/3.E).
  "SPX-LIC-420": {
    code: "SPX-LIC-420",
    httpStatus: 400,
    defaultMessage: "Chaîne de certification invalide",
    className: "ValidationError",
  },
  "SPX-LIC-421": {
    code: "SPX-LIC-421",
    httpStatus: 400,
    defaultMessage: "Certificat expiré",
    className: "ValidationError",
  },
  "SPX-LIC-422": {
    code: "SPX-LIC-422",
    httpStatus: 400,
    defaultMessage: "CA cert et CA private key ne correspondent pas",
    className: "ValidationError",
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

  // --- Licences Phase 5 (735-739) -------------------------------------------
  "SPX-LIC-735": {
    code: "SPX-LIC-735",
    httpStatus: 404,
    defaultMessage: "Licence introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-736": {
    code: "SPX-LIC-736",
    httpStatus: 409,
    defaultMessage: "Référence licence déjà utilisée",
    className: "ConflictError",
  },
  "SPX-LIC-737": {
    code: "SPX-LIC-737",
    httpStatus: 400,
    defaultMessage: "Données licence invalides",
    className: "ValidationError",
  },
  "SPX-LIC-738": {
    code: "SPX-LIC-738",
    httpStatus: 409,
    defaultMessage: "Transition de statut licence interdite",
    className: "ConflictError",
  },
  "SPX-LIC-739": {
    code: "SPX-LIC-739",
    httpStatus: 409,
    defaultMessage: "Conflit de version licence (modification concurrente)",
    className: "ConflictError",
  },

  // --- Renouvellements Phase 5 (740-742) ------------------------------------
  "SPX-LIC-740": {
    code: "SPX-LIC-740",
    httpStatus: 404,
    defaultMessage: "Renouvellement introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-741": {
    code: "SPX-LIC-741",
    httpStatus: 400,
    defaultMessage: "Données renouvellement invalides",
    className: "ValidationError",
  },
  "SPX-LIC-742": {
    code: "SPX-LIC-742",
    httpStatus: 409,
    defaultMessage: "Transition de statut renouvellement interdite",
    className: "ConflictError",
  },
  "SPX-LIC-743": {
    code: "SPX-LIC-743",
    httpStatus: 404,
    defaultMessage: "Produit introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-744": {
    code: "SPX-LIC-744",
    httpStatus: 409,
    defaultMessage: "Un produit avec ce code existe déjà",
    className: "ConflictError",
  },
  "SPX-LIC-745": {
    code: "SPX-LIC-745",
    httpStatus: 400,
    defaultMessage: "Données produit invalides",
    className: "ValidationError",
  },
  "SPX-LIC-746": {
    code: "SPX-LIC-746",
    httpStatus: 404,
    defaultMessage: "Article introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-747": {
    code: "SPX-LIC-747",
    httpStatus: 409,
    defaultMessage: "Un article avec ce code existe déjà pour ce produit",
    className: "ConflictError",
  },
  "SPX-LIC-748": {
    code: "SPX-LIC-748",
    httpStatus: 400,
    defaultMessage: "Données article invalides",
    className: "ValidationError",
  },
  "SPX-LIC-749": {
    code: "SPX-LIC-749",
    httpStatus: 404,
    defaultMessage: "Liaison licence-produit introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-750": {
    code: "SPX-LIC-750",
    httpStatus: 409,
    defaultMessage: "Ce produit est déjà attaché à cette licence",
    className: "ConflictError",
  },
  "SPX-LIC-751": {
    code: "SPX-LIC-751",
    httpStatus: 404,
    defaultMessage: "Liaison licence-article introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-752": {
    code: "SPX-LIC-752",
    httpStatus: 409,
    defaultMessage: "Cet article est déjà attaché à cette licence",
    className: "ConflictError",
  },
  "SPX-LIC-753": {
    code: "SPX-LIC-753",
    httpStatus: 400,
    defaultMessage: "Volume invalide (entier >= 0)",
    className: "ValidationError",
  },
  "SPX-LIC-754": {
    code: "SPX-LIC-754",
    httpStatus: 409,
    defaultMessage: "Snapshot de volume déjà enregistré pour cette période",
    className: "ConflictError",
  },
  "SPX-LIC-755": {
    code: "SPX-LIC-755",
    httpStatus: 409,
    defaultMessage: "Export d'audit trop volumineux — affiner les filtres",
    className: "ConflictError",
  },
  "SPX-LIC-756": {
    code: "SPX-LIC-756",
    httpStatus: 404,
    defaultMessage: "Configuration d'alerte introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-757": {
    code: "SPX-LIC-757",
    httpStatus: 400,
    defaultMessage: "Configuration d'alerte invalide",
    className: "ValidationError",
  },
  "SPX-LIC-758": {
    code: "SPX-LIC-758",
    httpStatus: 400,
    defaultMessage: "Au moins un seuil (volume ou date) est requis",
    className: "ValidationError",
  },
  "SPX-LIC-759": {
    code: "SPX-LIC-759",
    httpStatus: 404,
    defaultMessage: "Notification introuvable",
    className: "NotFoundError",
  },
  "SPX-LIC-760": {
    code: "SPX-LIC-760",
    httpStatus: 403,
    defaultMessage: "Notification appartient à un autre utilisateur",
    className: "ForbiddenError",
  },

  // --- Email (800-899) -----------------------------------------------------
  "SPX-LIC-800": {
    code: "SPX-LIC-800",
    httpStatus: 500,
    defaultMessage: "Échec d'envoi d'email",
    className: "InternalError",
  },
  "SPX-LIC-801": {
    code: "SPX-LIC-801",
    httpStatus: 400,
    defaultMessage: "Message email invalide (destinataire ou contenu)",
    className: "ValidationError",
  },
  "SPX-LIC-802": {
    code: "SPX-LIC-802",
    httpStatus: 400,
    defaultMessage: "Rendu template email échoué",
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
