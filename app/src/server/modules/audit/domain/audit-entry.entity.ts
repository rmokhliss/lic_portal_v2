// ==============================================================================
// LIC v2 — Entité AuditEntry (F-08)
//
// Domaine pur : aucune dépendance à Drizzle, postgres-js, env, logger.
// Importe uniquement TypeScript, shared/ (constantes SYSTEM) et module-error.
//
// Deux factories publiques :
//   - create(input) : validation complète des invariants → throw SPX-LIC-500
//   - system(input) : raccourci pour les jobs (force userId=SYSTEM, mode=JOB)
//
// Une factory technique pour le mapper :
//   - rehydrate(props) : pas de validation, BD = source de vérité.
//     Retourne PersistedAuditEntry (avec id + createdAt obligatoires).
// ==============================================================================

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { ValidationError } from "@/server/modules/error";

// Phase 3.E.0 : SCRIPT ajouté pour les scripts pnpm one-shot (ex: backfill
// `script:backfill-client-certs`). Cf. migration 0011.
export type AuditMode = "MANUEL" | "API" | "JOB" | "SEED" | "SCRIPT";

const VALID_MODES: ReadonlySet<AuditMode> = new Set(["MANUEL", "API", "JOB", "SEED", "SCRIPT"]);

// IPv4 (a.b.c.d) ou IPv6 (h:h:...:h, formes abrégées tolérées).
// Validation minimale : on rejette les formats clairement étrangers, pas une
// validation cryptographique stricte (le caller HTTP a déjà filtré en amont).
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^[a-fA-F0-9:]+$/;

export interface CreateAuditEntryInput {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly userId: string;
  readonly userDisplay?: string;
  readonly clientId?: string;
  readonly clientDisplay?: string;
  readonly ipAddress?: string;
  readonly mode: AuditMode;
  readonly metadata?: Record<string, unknown>;
}

/** Input simplifié pour les jobs pg-boss : pas de userId/userDisplay/mode
 *  (forcés à SYSTEM/Système (SYS-000)/JOB), pas d'ipAddress (jobs n'en ont pas). */
export interface CreateSystemAuditEntryInput {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly clientId?: string;
  readonly clientDisplay?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RehydrateAuditEntryProps extends CreateAuditEntryInput {
  readonly id: string;
  readonly createdAt: Date;
}

export class AuditEntry {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly userId: string;
  readonly mode: AuditMode;
  readonly beforeData?: Record<string, unknown>;
  readonly afterData?: Record<string, unknown>;
  readonly userDisplay?: string;
  readonly clientId?: string;
  readonly clientDisplay?: string;
  readonly ipAddress?: string;
  readonly metadata?: Record<string, unknown>;

  protected constructor(props: CreateAuditEntryInput) {
    this.entity = props.entity;
    this.entityId = props.entityId;
    this.action = props.action;
    this.userId = props.userId;
    this.mode = props.mode;
    this.beforeData = props.beforeData;
    this.afterData = props.afterData;
    this.userDisplay = props.userDisplay;
    this.clientId = props.clientId;
    this.clientDisplay = props.clientDisplay;
    this.ipAddress = props.ipAddress;
    this.metadata = props.metadata;
  }

  /** Factory standard. Throw ValidationError SPX-LIC-500 sur invariant violé. */
  static create(input: CreateAuditEntryInput): AuditEntry {
    AuditEntry.validate(input);
    return new AuditEntry(input);
  }

  /** Factory pour les actions automatisées (jobs pg-boss). Force userId=SYSTEM,
   *  userDisplay="Système (SYS-000)", mode="JOB". Délègue ensuite à create()
   *  pour la validation des autres champs. */
  static system(input: CreateSystemAuditEntryInput): AuditEntry {
    return AuditEntry.create({
      ...input,
      userId: SYSTEM_USER_ID,
      userDisplay: SYSTEM_USER_DISPLAY,
      mode: "JOB",
    });
  }

  /** Factory pour la rehydratation depuis la BD. Pas de re-validation : la BD
   *  est source de vérité (déjà validée à l'écriture). Utilisé exclusivement
   *  par AuditRepositoryPg.fromDb(). Retourne PersistedAuditEntry. */
  static rehydrate(props: RehydrateAuditEntryProps): PersistedAuditEntry {
    return new PersistedAuditEntry(props, props.id, props.createdAt);
  }

  private static validate(input: CreateAuditEntryInput): void {
    AuditEntry.requireNonEmpty("entity", input.entity);
    AuditEntry.requireNonEmpty("entityId", input.entityId);
    AuditEntry.requireNonEmpty("action", input.action);
    AuditEntry.requireNonEmpty("userId", input.userId);

    if (!VALID_MODES.has(input.mode)) {
      throw new ValidationError({
        code: "SPX-LIC-500",
        message: `mode invalide : "${input.mode}" — attendu MANUEL, API, JOB, SEED ou SCRIPT`,
      });
    }

    if (
      input.ipAddress !== undefined &&
      input.ipAddress !== "" &&
      !IPV4_REGEX.test(input.ipAddress) &&
      !IPV6_REGEX.test(input.ipAddress)
    ) {
      throw new ValidationError({
        code: "SPX-LIC-500",
        message: `ipAddress invalide : "${input.ipAddress}"`,
      });
    }

    // userId ≠ SYSTEM doit avoir un userDisplay (règle L9 — pas d'audit
    // anonyme avec un user humain).
    if (input.userId !== SYSTEM_USER_ID) {
      if (input.userDisplay === undefined || input.userDisplay === "") {
        throw new ValidationError({
          code: "SPX-LIC-500",
          message: "userDisplay obligatoire quand userId !== SYSTEM",
        });
      }
    }

    // clientId présent doit avoir un clientDisplay (DETTE-001 traitée — FTS
    // doit pouvoir matcher sur le nom client).
    if (input.clientId !== undefined && input.clientId !== "") {
      if (input.clientDisplay === undefined || input.clientDisplay === "") {
        throw new ValidationError({
          code: "SPX-LIC-500",
          message: "clientDisplay obligatoire quand clientId est fourni",
        });
      }
    }
  }

  private static requireNonEmpty(field: string, value: string): void {
    if (typeof value !== "string" || value.length === 0) {
      throw new ValidationError({
        code: "SPX-LIC-500",
        message: `${field} obligatoire (string non vide)`,
      });
    }
  }
}

/** Variante de AuditEntry avec `id` et `createdAt` non-optionnels.
 *  Retournée par AuditRepository.findById/search (entités persistées). */
export class PersistedAuditEntry extends AuditEntry {
  readonly id: string;
  readonly createdAt: Date;

  constructor(props: CreateAuditEntryInput, id: string, createdAt: Date) {
    super(props);
    this.id = id;
    this.createdAt = createdAt;
  }
}
