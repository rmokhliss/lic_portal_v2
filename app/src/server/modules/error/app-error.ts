// ==============================================================================
// LIC v2 — AppError : base abstraite des erreurs typées (Référentiel §4.2)
//
// Implémentation locale de l'équivalent @s2m/core-errors (PROJECT_CONTEXT §7).
// Toute erreur métier doit hériter d'AppError via une des sous-classes (errors.ts).
// Au niveau projet, ESLint interdit `new Error(...)` (no-restricted-syntax) sauf
// exception locale justifiée.
//
// Usage :
//   throw new NotFoundError({ code: "SPX-LIC-902", details: { entity, id } });
// ==============================================================================

import {
  ERROR_CATALOGUE,
  type AppErrorShape,
  type ErrorCode,
} from "@/shared/constants/error-codes";

export interface AppErrorOptions {
  readonly code: ErrorCode;
  /** Override le defaultMessage du catalogue (utile pour log/contexte enrichi). */
  readonly message?: string;
  /** Payload structuré non-sensible (ids, champs invalides, etc.). */
  readonly details?: Record<string, unknown>;
  /** Erreur sous-jacente (ES2022 Error.cause). */
  readonly cause?: unknown;
}

export interface AppErrorJSON {
  readonly code: ErrorCode;
  readonly message: string;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
  /** Présent uniquement hors production. */
  readonly stack?: string;
  /** Présent uniquement hors production. */
  readonly cause?: { readonly message: string; readonly stack?: string } | string;
}

function serializeCause(cause: unknown): { message: string; stack?: string } | string {
  if (cause instanceof Error) {
    return cause.stack !== undefined
      ? { message: cause.message, stack: cause.stack }
      : { message: cause.message };
  }
  return String(cause);
}

export abstract class AppError extends Error implements AppErrorShape {
  readonly __isAppError = true as const;
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;
  abstract readonly httpStatus: number;

  /** Phase 19+ — nom stable de la classe (résistant à la minification Next.js
   *  prod / Turbopack qui écrase `Class.name` en token court "c", "a", etc.).
   *  Chaque sous-classe override ce static avec son nom littéral, utilisé
   *  par le check classe ↔ code ci-dessous. Sans ça, le check throw un
   *  faux positif sur n'importe quelle erreur métier en build prod. */
  static readonly typeName: string = "AppError";

  constructor(opts: AppErrorOptions) {
    // ERROR_CATALOGUE[opts.code] est typé `ErrorCodeEntry` (et non `| undefined`)
    // car `ErrorCode` est une union littérale fermée et le Record est exhaustif :
    // si une entrée manque, TS casse en compile time. Pas de garde-fou runtime nécessaire.
    const entry = ERROR_CATALOGUE[opts.code];

    super(
      opts.message ?? entry.defaultMessage,
      opts.cause !== undefined ? { cause: opts.cause } : undefined,
    );

    // Phase 19+ — `typeName` static survit à la minification (string littéral
    // figé au build), contrairement à `new.target.name` qui est rebadgé en
    // identifiant court par Turbopack/Webpack en prod.
    const ctor = new.target;
    this.name = ctor.typeName;
    this.code = opts.code;
    if (opts.details !== undefined) {
      this.details = opts.details;
    }

    // Vérification classe ↔ code (STOP validation #2). Run en dev ET en prod :
    // une mauvaise association code/classe produit une erreur de programmation
    // qu'on veut détecter en environnement réel, pas seulement en test.
    const expectedClass = entry.className;
    const actualClass = ctor.typeName;
    if (expectedClass !== actualClass) {
      // eslint-disable-next-line no-restricted-syntax -- bootstrap exception : lever une AppError ici récurserait dans ce même check
      throw new Error(
        `Code ${opts.code} déclaré pour ${expectedClass}, levé depuis ${actualClass}`,
      );
    }

    // Stack trace V8 propre (élimine le frame du constructeur).
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  toJSON(): AppErrorJSON {
    // Lecture INTRA-méthode (jamais en constante top-level) : permet aux tests
    // de muter NODE_ENV via vi.stubEnv("NODE_ENV", "production") + vi.unstubAllEnvs.
    // Lecture directe de process.env : error/ est transverse et chargé tôt,
    // ne doit pas dépendre de infrastructure/env/ (cycle de bootstrap potentiel).
    const isProd = process.env.NODE_ENV === "production";
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(!isProd && this.stack !== undefined ? { stack: this.stack } : {}),
      ...(!isProd && this.cause !== undefined ? { cause: serializeCause(this.cause) } : {}),
    };
  }
}
