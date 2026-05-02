// Test unitaire SearchAuditLogUseCase (F-08). Mock du repo.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AuditRepository } from "@/server/modules/audit/ports/audit.repository";

import { SearchAuditLogUseCase } from "../search-audit-log.usecase";

class FakeAuditRepository extends AuditRepository {
  save = vi.fn();
  findById = vi.fn();
  search = vi.fn().mockResolvedValue({ items: [], nextCursor: null, effectiveLimit: 50 });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("SearchAuditLogUseCase.execute — limit cap", () => {
  it("default limit = 50", async () => {
    const repo = new FakeAuditRepository();
    await new SearchAuditLogUseCase(repo).execute({});
    expect(vi.mocked(repo.search)).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });

  it("conserve une limit valide entre 1 et 200", async () => {
    const repo = new FakeAuditRepository();
    await new SearchAuditLogUseCase(repo).execute({ limit: 75 });
    expect(vi.mocked(repo.search)).toHaveBeenCalledWith(expect.objectContaining({ limit: 75 }));
  });

  it("cap silencieux à 200 (Référentiel §4.15)", async () => {
    const repo = new FakeAuditRepository();
    await new SearchAuditLogUseCase(repo).execute({ limit: 999 });
    expect(vi.mocked(repo.search)).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }));
  });

  it("clamp à 1 si limit négatif ou zéro", async () => {
    const repo = new FakeAuditRepository();
    await new SearchAuditLogUseCase(repo).execute({ limit: 0 });
    expect(vi.mocked(repo.search)).toHaveBeenCalledWith(expect.objectContaining({ limit: 1 }));
  });
});

describe("SearchAuditLogUseCase.execute — validation dates", () => {
  it("throw SPX-LIC-500 si fromDate > toDate", async () => {
    const repo = new FakeAuditRepository();
    await expect(
      new SearchAuditLogUseCase(repo).execute({
        fromDate: new Date("2026-05-02T12:00:00Z"),
        toDate: new Date("2026-05-01T12:00:00Z"),
      }),
    ).rejects.toMatchObject({ code: "SPX-LIC-500" });

    expect(vi.mocked(repo.search)).not.toHaveBeenCalled();
  });

  it("accepte fromDate === toDate (intervalle d'1 instant)", async () => {
    const repo = new FakeAuditRepository();
    const d = new Date("2026-05-02T12:00:00Z");
    await new SearchAuditLogUseCase(repo).execute({ fromDate: d, toDate: d });
    expect(vi.mocked(repo.search)).toHaveBeenCalledTimes(1);
  });
});

describe("SearchAuditLogUseCase.execute — propagation", () => {
  it("retourne le résultat du repo tel quel", async () => {
    const repo = new FakeAuditRepository();
    vi.mocked(repo.search).mockResolvedValueOnce({
      items: [],
      nextCursor: "abc",
      effectiveLimit: 50,
    });
    const result = await new SearchAuditLogUseCase(repo).execute({});
    expect(result).toEqual({ items: [], nextCursor: "abc", effectiveLimit: 50 });
  });
});
