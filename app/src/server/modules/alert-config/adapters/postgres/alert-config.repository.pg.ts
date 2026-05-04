// ==============================================================================
// LIC v2 — Adapter Postgres AlertConfigRepository (Phase 8.B)
// ==============================================================================

import { asc, eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/server/infrastructure/db/client";
import type * as schema from "@/server/infrastructure/db/schema";
import { InternalError } from "@/server/modules/error";

import type { AlertConfig, PersistedAlertConfig } from "../../domain/alert-config.entity";
import { AlertConfigRepository, type DbTransaction } from "../../ports/alert-config.repository";

import { toEntity } from "./alert-config.mapper";
import { alertConfigs } from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

export class AlertConfigRepositoryPg extends AlertConfigRepository {
  constructor(private readonly db: DbInstance = defaultDb) {
    super();
  }

  async findById(id: string, tx?: DbTransaction): Promise<PersistedAlertConfig | null> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(alertConfigs).where(eq(alertConfigs.id, id)).limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByClient(
    clientId: string,
    tx?: DbTransaction,
  ): Promise<readonly PersistedAlertConfig[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.clientId, clientId))
      .orderBy(asc(alertConfigs.libelle));
    return rows.map(toEntity);
  }

  async findAllActive(tx?: DbTransaction): Promise<readonly PersistedAlertConfig[]> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const rows = await target.select().from(alertConfigs).where(eq(alertConfigs.actif, true));
    return rows.map(toEntity);
  }

  async save(
    config: AlertConfig,
    actorId: string,
    tx?: DbTransaction,
  ): Promise<PersistedAlertConfig> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    const [row] = await target
      .insert(alertConfigs)
      .values({
        clientId: config.clientId,
        libelle: config.libelle,
        canaux: [...config.canaux],
        seuilVolumePct: config.seuilVolumePct,
        seuilDateJours: config.seuilDateJours,
        actif: config.actif,
        creePar: actorId,
        modifiePar: actorId,
      })
      .returning();
    if (row === undefined) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: "INSERT lic_alert_configs n'a rien retourné",
      });
    }
    return toEntity(row);
  }

  async update(config: PersistedAlertConfig, actorId: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target
      .update(alertConfigs)
      .set({
        libelle: config.libelle,
        canaux: [...config.canaux],
        seuilVolumePct: config.seuilVolumePct,
        seuilDateJours: config.seuilDateJours,
        actif: config.actif,
        modifiePar: actorId,
        updatedAt: new Date(),
      })
      .where(eq(alertConfigs.id, config.id));
  }

  async delete(id: string, tx?: DbTransaction): Promise<void> {
    const target = (tx as PgDatabase<never> | undefined) ?? this.db;
    await target.delete(alertConfigs).where(eq(alertConfigs.id, id));
  }
}
