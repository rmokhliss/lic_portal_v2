// ==============================================================================
// LIC v2 — Test d'intégration ToggleTeamMemberUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TeamMemberRepositoryPg } from "../../adapters/postgres/team-member.repository.pg";
import { ToggleTeamMemberUseCase } from "../toggle-team-member.usecase";

const ctx = createTestDb();
const repo = new TeamMemberRepositoryPg(ctx.db);
const useCase = new ToggleTeamMemberUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

let seededId: number;

beforeEach(async () => {
  const rows = await ctx.sql<{ id: number }[]>`
    INSERT INTO lic_team_members (nom, role_team) VALUES ('DUPONT', 'SALES')
    RETURNING id
  `;
  if (rows[0] === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("seed failed");
  }
  seededId = rows[0].id;
});

describe("ToggleTeamMemberUseCase", () => {
  it("première bascule : true → false", async () => {
    const dto = await useCase.execute(seededId);
    expect(dto.actif).toBe(false);
  });

  it("deuxième bascule : false → true", async () => {
    await useCase.execute(seededId);
    const dto = await useCase.execute(seededId);
    expect(dto.actif).toBe(true);
  });

  it("throw NotFoundError SPX-LIC-715 si inexistant", async () => {
    await expect(useCase.execute(999999)).rejects.toMatchObject({ code: "SPX-LIC-715" });
  });

  it("throw ValidationError SPX-LIC-717 si id invalide", async () => {
    await expect(useCase.execute(0)).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });
});
