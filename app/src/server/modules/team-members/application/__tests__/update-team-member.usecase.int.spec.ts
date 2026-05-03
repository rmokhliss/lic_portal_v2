// ==============================================================================
// LIC v2 — Test d'intégration UpdateTeamMemberUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TeamMemberRepositoryPg } from "../../adapters/postgres/team-member.repository.pg";
import { UpdateTeamMemberUseCase } from "../update-team-member.usecase";

const ctx = createTestDb();
const repo = new TeamMemberRepositoryPg(ctx.db);
const useCase = new UpdateTeamMemberUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

let seededId: number;

beforeEach(async () => {
  const rows = await ctx.sql<{ id: number }[]>`
    INSERT INTO lic_team_members (nom, prenom, email, telephone, role_team, region_code)
    VALUES ('DUPONT', 'Alice', 'alice@s2m.com', '+33612345678', 'SALES', 'NORD_AFRIQUE')
    RETURNING id
  `;
  if (rows[0] === undefined) {
    // eslint-disable-next-line no-restricted-syntax -- test fixture, pré-condition de runtime
    throw new Error("seed failed");
  }
  seededId = rows[0].id;
});

describe("UpdateTeamMemberUseCase — patch nom + roleTeam", () => {
  it("met à jour nom et roleTeam", async () => {
    const dto = await useCase.execute({ id: seededId, nom: "MARTIN", roleTeam: "DM" });
    expect(dto.nom).toBe("MARTIN");
    expect(dto.roleTeam).toBe("DM");
    expect(dto.prenom).toBe("Alice"); // inchangé
  });

  it("rejette nom vide (SPX-LIC-717)", async () => {
    await expect(useCase.execute({ id: seededId, nom: "" })).rejects.toMatchObject({
      code: "SPX-LIC-717",
    });
  });

  it("rejette roleTeam invalide", async () => {
    await expect(
      useCase.execute({ id: seededId, roleTeam: "BOSS" as unknown as "SALES" }),
    ).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });
});

describe("UpdateTeamMemberUseCase — patch optionnels (null = effacer)", () => {
  it("prenom=null efface", async () => {
    const dto = await useCase.execute({ id: seededId, prenom: null });
    expect(dto.prenom).toBeNull();
  });

  it("email=null efface", async () => {
    const dto = await useCase.execute({ id: seededId, email: null });
    expect(dto.email).toBeNull();
  });

  it("regionCode=null efface", async () => {
    const dto = await useCase.execute({ id: seededId, regionCode: null });
    expect(dto.regionCode).toBeNull();
  });

  it("email=string remplace", async () => {
    const dto = await useCase.execute({ id: seededId, email: "alice2@s2m.com" });
    expect(dto.email).toBe("alice2@s2m.com");
  });

  it("absence de champ → inchangé", async () => {
    const dto = await useCase.execute({ id: seededId, nom: "MARTIN" });
    expect(dto.prenom).toBe("Alice");
    expect(dto.email).toBe("alice@s2m.com");
    expect(dto.regionCode).toBe("NORD_AFRIQUE");
  });
});

describe("UpdateTeamMemberUseCase — erreurs", () => {
  it("throw NotFoundError SPX-LIC-715 si id inexistant", async () => {
    await expect(useCase.execute({ id: 999999, nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-715",
    });
  });

  it("throw ValidationError SPX-LIC-717 si id invalide", async () => {
    await expect(useCase.execute({ id: 0, nom: "x" })).rejects.toMatchObject({
      code: "SPX-LIC-717",
    });
  });
});
