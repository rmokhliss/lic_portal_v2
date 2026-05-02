// Test unitaire GetAuditEntryByIdUseCase (F-08). Mock du repo.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import { AuditRepository } from "@/server/modules/audit/ports/audit.repository";

import { GetAuditEntryByIdUseCase } from "../get-audit-entry-by-id.usecase";

class FakeAuditRepository extends AuditRepository {
  save = vi.fn();
  findById = vi.fn();
  search = vi.fn();
}

const VALID_UUID = "01928c8e-aaaa-bbbb-cccc-ddddeeee0001";

afterEach(() => vi.clearAllMocks());

describe("GetAuditEntryByIdUseCase.execute — validation id", () => {
  it.each<readonly [string, string]>([
    ["string vide", ""],
    ["non-uuid", "not-a-uuid"],
    ["uuid mal formé", "0192-aaaa"],
    ["uuid avec caractères non-hex", "01928c8e-zzzz-bbbb-cccc-ddddeeee0001"],
  ])("rejette id = %s", async (_label, id) => {
    const repo = new FakeAuditRepository();
    await expect(new GetAuditEntryByIdUseCase(repo).execute(id)).rejects.toMatchObject({
      code: "SPX-LIC-500",
    });
    expect(vi.mocked(repo.findById)).not.toHaveBeenCalled();
  });
});

describe("GetAuditEntryByIdUseCase.execute — lookup", () => {
  it("retourne l'entry quand trouvée", async () => {
    const entry = AuditEntry.rehydrate({
      id: VALID_UUID,
      createdAt: new Date(),
      entity: "user",
      entityId: VALID_UUID,
      action: "PASSWORD_CHANGED",
      userId: VALID_UUID,
      userDisplay: "x",
      mode: "MANUEL",
    });
    const repo = new FakeAuditRepository();
    vi.mocked(repo.findById).mockResolvedValueOnce(entry);

    const result = await new GetAuditEntryByIdUseCase(repo).execute(VALID_UUID);
    expect(result).toBe(entry);
  });

  it("throw NotFoundError SPX-LIC-501 quand absent", async () => {
    const repo = new FakeAuditRepository();
    vi.mocked(repo.findById).mockResolvedValueOnce(null);

    await expect(new GetAuditEntryByIdUseCase(repo).execute(VALID_UUID)).rejects.toMatchObject({
      code: "SPX-LIC-501",
    });
  });
});
