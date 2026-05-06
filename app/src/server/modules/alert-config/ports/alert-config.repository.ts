// ==============================================================================
// LIC v2 — Port AlertConfigRepository (Phase 8.B)
// ==============================================================================

import type { AlertConfig, PersistedAlertConfig } from "../domain/alert-config.entity";

export type DbTransaction = unknown;

export abstract class AlertConfigRepository {
  abstract findById(id: string, tx?: DbTransaction): Promise<PersistedAlertConfig | null>;
  abstract findByClient(
    clientId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedAlertConfig[]>;
  /** Toutes les configs actives — utilisé par le job check-alerts. */
  abstract findAllActive(tx?: DbTransaction): Promise<readonly PersistedAlertConfig[]>;
  /** Phase 17 S4 — vue cross-clients pour l'écran /alerts (actives + inactives). */
  abstract findAll(tx?: DbTransaction): Promise<readonly PersistedAlertConfig[]>;
  abstract save(
    config: AlertConfig,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedAlertConfig>;
  abstract update(config: PersistedAlertConfig, actorId: string, tx?: DbTransaction): Promise<void>;
  abstract delete(id: string, tx?: DbTransaction): Promise<void>;
}
