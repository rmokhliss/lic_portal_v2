// Test unitaire RecordAuditEntryUseCase (F-08). Mock du repo, pas de BD réelle.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock db.transaction pour vérifier l'enveloppement transactionnel standalone.
vi.mock("@/server/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      // Exécute le callback avec un faux tx (objet sentinel pour assert).
      return cb({ __fake: "tx" });
    }),
  },
}));

import { db } from "@/server/infrastructure/db/client";
import { AuditRepository } from "@/server/modules/audit/ports/audit.repository";

import { RecordAuditEntryUseCase } from "../record-audit-entry.usecase";

class FakeAuditRepository extends AuditRepository {
  save = vi.fn().mockResolvedValue(undefined);
  findById = vi.fn();
  search = vi.fn();
}

const VALID_INPUT = {
  entity: "user",
  entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
  action: "PASSWORD_CHANGED",
  userId: "01928c8e-bbbb-cccc-dddd-eeeeffff0002",
  userDisplay: "Alice DUPONT (MAT-042)",
  mode: "MANUEL" as const,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("RecordAuditEntryUseCase.execute — sans tx", () => {
  it("crée une transaction propre et appelle save() avec le tx généré", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);

    await useCase.execute(VALID_INPUT);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- accès au mock via vi.mocked, contexte préservé par Vitest
    expect(vi.mocked(db.transaction)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.save)).toHaveBeenCalledTimes(1);
    // tx passé est celui généré par db.transaction (l'objet sentinel mock)
    const call = repo.save.mock.calls[0] as [unknown, unknown];
    expect(call[1]).toEqual({ __fake: "tx" });
  });

  it("appelle save() avec une AuditEntry valide", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);

    await useCase.execute(VALID_INPUT);

    const calls = repo.save.mock.calls as [unknown, unknown][];
    const entry = calls[0]?.[0];
    expect(entry).toMatchObject({
      entity: "user",
      action: "PASSWORD_CHANGED",
      userId: VALID_INPUT.userId,
      mode: "MANUEL",
    });
  });
});

describe("RecordAuditEntryUseCase.execute — avec tx parente", () => {
  it("réutilise le tx fourni (PAS de nouvelle transaction)", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);
    const parentTx = { __parent: "tx" };

    await useCase.execute(VALID_INPUT, parentTx);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- accès au mock via vi.mocked, contexte préservé par Vitest
    expect(vi.mocked(db.transaction)).not.toHaveBeenCalled();
    expect(vi.mocked(repo.save)).toHaveBeenCalledWith(expect.anything(), parentTx);
  });
});

describe("RecordAuditEntryUseCase.execute — invariants", () => {
  it("propage la ValidationError SPX-LIC-500 si AuditEntry.create() échoue", async () => {
    const repo = new FakeAuditRepository();
    const useCase = new RecordAuditEntryUseCase(repo);

    await expect(useCase.execute({ ...VALID_INPUT, entity: "" })).rejects.toMatchObject({
      code: "SPX-LIC-500",
    });

    // save() ne doit PAS avoir été appelée si validation échoue.
    expect(vi.mocked(repo.save)).not.toHaveBeenCalled();
  });
});
