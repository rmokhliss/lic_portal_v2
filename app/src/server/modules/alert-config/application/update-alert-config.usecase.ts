// ==============================================================================
// LIC v2 — UpdateAlertConfigUseCase (Phase 8.B)
// Audit ALERT_CONFIG_UPDATED avec before/after.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { InternalError } from "@/server/modules/error";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type AlertConfigDTO } from "../adapters/postgres/alert-config.mapper";
import { alertConfigNotFoundById } from "../domain/alert-config.errors";
import type { AlertChannel } from "../domain/alert-config.entity";
import type { AlertConfigRepository } from "../ports/alert-config.repository";

export interface UpdateAlertConfigInput {
  readonly id: string;
  readonly libelle?: string;
  readonly canaux?: readonly AlertChannel[];
  readonly seuilVolumePct?: number | null;
  readonly seuilDateJours?: number | null;
  readonly actif?: boolean;
}

export class UpdateAlertConfigUseCase {
  constructor(
    private readonly alertConfigRepository: AlertConfigRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(input: UpdateAlertConfigInput, actorId: string): Promise<AlertConfigDTO> {
    const updated = await db.transaction(async (tx) => {
      const existing = await this.alertConfigRepository.findById(input.id, tx);
      if (existing === null) throw alertConfigNotFoundById(input.id);

      const patched = existing.withPatch({
        ...(input.libelle !== undefined ? { libelle: input.libelle } : {}),
        ...(input.canaux !== undefined ? { canaux: input.canaux } : {}),
        ...("seuilVolumePct" in input ? { seuilVolumePct: input.seuilVolumePct } : {}),
        ...("seuilDateJours" in input ? { seuilDateJours: input.seuilDateJours } : {}),
        ...(input.actif !== undefined ? { actif: input.actif } : {}),
      });
      await this.alertConfigRepository.update(patched, actorId, tx);

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const entry = AuditEntry.create({
        entity: "alert-config",
        entityId: patched.id,
        action: "ALERT_CONFIG_UPDATED",
        beforeData: existing.toAuditSnapshot(),
        afterData: patched.toAuditSnapshot(),
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        mode: "MANUEL",
      });
      await this.auditRepository.save(entry, tx);

      return patched;
    });

    return toDTO(updated);
  }
}
