// ==============================================================================
// LIC v2 — RecordAuditEntryUseCase (F-08)
//
// Use-case standalone pour les futures Server Actions audit (Phase 11 EC-06).
// PAS appelé par les use-cases internes d'autres modules (option (b) Stop #1) :
// les use-cases métier (change-password, etc.) gardent un accès direct au port
// AuditRepository pour rester dans leur transaction parente.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import {
  AuditEntry,
  type CreateAuditEntryInput,
} from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository, DbTransaction } from "@/server/modules/audit/ports/audit.repository";

export type RecordAuditEntryInput = CreateAuditEntryInput;

export class RecordAuditEntryUseCase {
  constructor(private readonly auditRepository: AuditRepository) {}

  /** Crée l'entité (validation invariants → throw ValidationError SPX-LIC-500
   *  si invalide) puis persiste. */
  async execute(input: RecordAuditEntryInput, tx?: DbTransaction): Promise<void> {
    const entry = AuditEntry.create(input);

    if (tx !== undefined) {
      // Participe à la transaction parente (cas appelé depuis une autre
      // mutation métier qui a déjà ouvert sa transaction).
      await this.auditRepository.save(entry, tx);
      return;
    }

    // Règle L3 PROJECT_CONTEXT : toute mutation métier s'inscrit dans une
    // transaction, même standalone. Overhead négligeable (1 INSERT) pour un BO
    // interne. Cohérence > micro-perf.
    await db.transaction(async (newTx) => {
      await this.auditRepository.save(entry, newTx);
    });
  }
}
