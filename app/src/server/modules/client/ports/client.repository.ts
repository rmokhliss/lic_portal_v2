// ==============================================================================
// LIC v2 — Port ClientRepository (Phase 4 étape 4.B)
//
// Surface 6 méthodes :
//   - findById(id, tx?)                  → PersistedClient | null
//   - findByCode(codeClient, tx?)        → PersistedClient | null
//   - findPaginated(opts, tx?)           → cursor-based pagination
//   - saveWithSiegeEntite(client, siege, tx?) → INSERT client + INSERT entite
//                                              "Siège" en cascade dans la même tx
//   - update(client, expectedVersion, tx?) → UPDATE avec optimistic locking
//                                            (throw 728 si version diverge)
//   - updateStatus(client, expectedVersion, tx?)  → UPDATE statut + bump version
//
// Le `saveWithSiegeEntite` est volontairement encapsulé côté port (pas
// d'EntiteRepository injecté en 4.B) — l'entité « Siège » est un invariant
// métier de la création client (1 client ⇒ 1 entité Siège), il est donc
// cohérent que le repo client gère cette dual-write atomique.
// Le module entite (4.C) introduira un EntiteRepository complet pour les
// CRUD ad-hoc d'entités hors création initiale.
//
// `tx` optionnel : permet aux use-cases d'orchestrer client + audit dans une
// seule transaction (règle L3 — entité métier = audit obligatoire).
// ==============================================================================

import type { PersistedClient, Client } from "../domain/client.entity";

export type DbTransaction = unknown;

export interface FindClientsPaginatedInput {
  /** Filtre actif (boolean). undefined = tous. */
  readonly actif?: boolean;
  /** Filtre statut (singulier ou liste). undefined = tous. */
  readonly statutClient?:
    | "PROSPECT"
    | "ACTIF"
    | "SUSPENDU"
    | "RESILIE"
    | readonly ("PROSPECT" | "ACTIF" | "SUSPENDU" | "RESILIE")[];
  /** FTS texte libre — si non vide, applique `search_vector @@ plainto_tsquery`. */
  readonly q?: string;
  /** Phase 20 R-29 — filtre exact pays (code ISO 2 lettres ex 'MA'). */
  readonly codePays?: string;
  /** Phase 20 R-29 — filtre exact account_manager (display "Prénom NOM"). */
  readonly accountManager?: string;
  /** Phase 20 R-29 — filtre exact sales_responsable. */
  readonly salesResponsable?: string;
  /** Phase 21 R-29 — filtre région via JOIN lic_pays_ref.region_code. Le
   *  client n'a pas de region_code direct (dérivation pays → région). */
  readonly regionCode?: string;
  /** Phase 21 R-29 — true = retourne uniquement les clients SANS licence
   *  ACTIF (NOT EXISTS sur lic_licences). undefined/false = pas de filtre. */
  readonly sansLicence?: boolean;
  /** Cursor base64url(`<ISO>|<UUID>`). undefined = première page. */
  readonly cursor?: string;
  /** 1..200, default 50 (volume client gérable, plus que les 200 référentiels). */
  readonly limit?: number;
}

export interface FindClientsPaginatedOutput {
  readonly items: readonly PersistedClient[];
  readonly nextCursor: string | null;
  readonly effectiveLimit: number;
  /** Phase 20 R-29 — total clients matchant les filtres (hors pagination). */
  readonly total: number;
}

/** Données minimales pour créer l'entité « Siège » dans la même tx que le
 *  client. Pas de creePar — le use-case passe l'actorId à l'adapter. */
export interface SiegeEntiteInput {
  readonly nom: string;
  /** Hérité du client si absent (généralement). */
  readonly codePays?: string;
}

export interface SaveWithSiegeEntiteOutput {
  readonly client: PersistedClient;
  readonly siegeEntiteId: string;
}

/** Phase 14 — credentials PKI client lus pour la signature des `.lic`. La
 *  clé privée reste chiffrée (AES-256-GCM) ; le déchiffrement est porté par
 *  le use-case avec `APP_MASTER_KEY`. */
export interface ClientCredentials {
  readonly privateKeyEnc: string;
  readonly certificatePem: string;
  readonly expiresAt: Date;
}

export abstract class ClientRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedClient | null>;

  abstract findByCode(codeClient: string, tx?: DbTransaction): Promise<PersistedClient | null>;

  abstract findPaginated(
    input: FindClientsPaginatedInput,
    tx?: DbTransaction,
  ): Promise<FindClientsPaginatedOutput>;

  /** Atomique : INSERT lic_clients + INSERT lic_entites (Siège) dans la
   *  transaction `tx`. `actorId` posé sur cree_par des deux tables. */
  abstract saveWithSiegeEntite(
    client: Client,
    siege: SiegeEntiteInput,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<SaveWithSiegeEntiteOutput>;

  /** UPDATE profil + statut. Optimistic locking : throw SPX-LIC-728 si la
   *  version BD ne correspond pas à `expectedVersion`. Bump version+1 sur
   *  succès. `actorId` posé sur modifie_par. */
  abstract update(
    client: PersistedClient,
    expectedVersion: number,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedClient>;

  /** Phase 3.D — Attache un certificat client (3 colonnes Phase 3.B) sur un
   *  client existant. UPDATE simple : pas de bump version (les colonnes PKI
   *  sont gérées hors du modèle métier optimistic-lock). `tx` permet d'inclure
   *  cet UPDATE dans la même transaction que `saveWithSiegeEntite` + audit. */
  abstract attachCertificate(
    clientId: string,
    data: {
      readonly privateKeyEnc: string;
      readonly certificatePem: string;
      readonly expiresAt: Date;
    },
    tx?: DbTransaction,
  ): Promise<void>;

  /** Phase 14 — lit les colonnes PKI (Phase 3.B) pour signer un `.lic`.
   *  Retourne null si le client n'existe pas OU si une des 3 colonnes est
   *  null (cas client legacy pré-Phase-3 sans backfill). */
  abstract findClientCredentials(
    clientId: string,
    tx?: DbTransaction,
  ): Promise<ClientCredentials | null>;

  /** Phase 24 — bulk nullify des 3 colonnes PKI (`client_private_key_enc`,
   *  `client_certificate_pem`, `client_certificate_expires_at`) sur tous les
   *  clients. Utilisé par `delete-ca.usecase` : quand la CA S2M est supprimée,
   *  tous les certificats clients qu'elle a signés deviennent caducs.
   *  Retourne le nombre de lignes affectées. */
  abstract nullifyAllCertificates(tx?: DbTransaction): Promise<number>;
}
