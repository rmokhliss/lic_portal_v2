// ==============================================================================
// LIC v2 — Test d'intégration GetTeamMemberUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TeamMemberRepositoryPg } from "../../adapters/postgres/team-member.repository.pg";
import { GetTeamMemberUseCase } from "../get-team-member.usecase";

const ctx = createTestDb();
const repo = new TeamMemberRepositoryPg(ctx.db);
const useCase = new GetTeamMemberUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

let seededId: number;

beforeEach(async () => {
  const rows = await ctx.sql<{ id: number }[]>`
    INSERT INTO lic_team_members (nom, prenom, role_team, region_code)
    VALUES ('DUPONT', 'Alice', 'SALES', 'NORD_AFRIQUE')
    RETURNING id
  `;
  if (rows[0] === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("seed failed");
  }
  seededId = rows[0].id;
});

describe("GetTeamMemberUseCase", () => {
  it("retourne le membre par id", async () => {
    const result = await useCase.execute(seededId);
    expect(result.id).toBe(seededId);
    expect(result.nom).toBe("DUPONT");
    expect(result.prenom).toBe("Alice");
    expect(result.roleTeam).toBe("SALES");
  });

  it("throw NotFoundError SPX-LIC-715 si id inexistant", async () => {
    await expect(useCase.execute(999999)).rejects.toMatchObject({ code: "SPX-LIC-715" });
  });

  it("throw ValidationError SPX-LIC-717 si id <= 0", async () => {
    await expect(useCase.execute(0)).rejects.toMatchObject({ code: "SPX-LIC-717" });
    await expect(useCase.execute(-1)).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });

  it("throw ValidationError SPX-LIC-717 si id non-entier", async () => {
    await expect(useCase.execute(1.5)).rejects.toMatchObject({ code: "SPX-LIC-717" });
    await expect(useCase.execute(Number.NaN)).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });
});
