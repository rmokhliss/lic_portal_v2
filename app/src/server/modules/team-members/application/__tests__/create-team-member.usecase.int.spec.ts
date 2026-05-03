// ==============================================================================
// LIC v2 — Test d'intégration CreateTeamMemberUseCase (Phase 2.B étape 4/7)
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TeamMemberRepositoryPg } from "../../adapters/postgres/team-member.repository.pg";
import { CreateTeamMemberUseCase } from "../create-team-member.usecase";

const ctx = createTestDb();
const repo = new TeamMemberRepositoryPg(ctx.db);
const useCase = new CreateTeamMemberUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

describe("CreateTeamMemberUseCase — cas nominaux", () => {
  it("INSERT et retourne le DTO complet", async () => {
    const dto = await useCase.execute({
      nom: "DUPONT",
      prenom: "Alice",
      email: "alice@s2m.com",
      telephone: "+33612345678",
      roleTeam: "SALES",
      regionCode: "NORD_AFRIQUE",
    });
    expect(dto.nom).toBe("DUPONT");
    expect(dto.prenom).toBe("Alice");
    expect(dto.email).toBe("alice@s2m.com");
    expect(dto.roleTeam).toBe("SALES");
    expect(dto.regionCode).toBe("NORD_AFRIQUE");
    expect(dto.actif).toBe(true);
    expect(typeof dto.id).toBe("number");
  });

  it("INSERT minimal (nom + roleTeam) → champs optionnels null", async () => {
    const dto = await useCase.execute({ nom: "MARTIN", roleTeam: "AM" });
    expect(dto.prenom).toBeNull();
    expect(dto.email).toBeNull();
    expect(dto.telephone).toBeNull();
    expect(dto.regionCode).toBeNull();
  });

  it("permet plusieurs membres avec le même nom (pas de UNIQUE constraint)", async () => {
    await useCase.execute({ nom: "DUPONT", roleTeam: "SALES" });
    const second = await useCase.execute({ nom: "DUPONT", roleTeam: "AM" });
    expect(typeof second.id).toBe("number");
  });
});

describe("CreateTeamMemberUseCase — invariants (SPX-LIC-717)", () => {
  it("rejette nom vide AVANT BD", async () => {
    await expect(useCase.execute({ nom: "", roleTeam: "SALES" })).rejects.toMatchObject({
      code: "SPX-LIC-717",
    });
  });

  it("rejette roleTeam invalide", async () => {
    await expect(
      useCase.execute({ nom: "X", roleTeam: "BOSS" as unknown as "SALES" }),
    ).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });

  it("rejette email format invalide", async () => {
    await expect(
      useCase.execute({ nom: "X", roleTeam: "SALES", email: "pasunemail" }),
    ).rejects.toMatchObject({ code: "SPX-LIC-717" });
  });
});
