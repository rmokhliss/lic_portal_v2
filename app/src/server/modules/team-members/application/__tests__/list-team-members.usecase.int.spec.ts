// ==============================================================================
// LIC v2 — Test d'intégration ListTeamMembersUseCase (Phase 2.B étape 4/7)
//
// Couvre les 3 filtres : actif, roleTeam, regionCode + leur combinaison.
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

import { TeamMemberRepositoryPg } from "../../adapters/postgres/team-member.repository.pg";
import { ListTeamMembersUseCase } from "../list-team-members.usecase";

const ctx = createTestDb();
const repo = new TeamMemberRepositoryPg(ctx.db);
const useCase = new ListTeamMembersUseCase(repo);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx, { cleanTables: ["lic_team_members"] });

async function seedThree(): Promise<void> {
  await ctx.sql`
    INSERT INTO lic_team_members (nom, prenom, role_team, region_code) VALUES
    ('DUPONT',  'Alice',   'SALES', 'NORD_AFRIQUE'),
    ('MARTIN',  'Bob',     'AM',    'AFRIQUE_OUEST'),
    ('LEROY',   'Charlie', 'DM',    'NORD_AFRIQUE')
  `;
}

describe("ListTeamMembersUseCase — sans filtre", () => {
  it("retourne [] quand aucun membre seed", async () => {
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it("retourne les 3 membres triés par nom ASC", async () => {
    await seedThree();
    const result = await useCase.execute();
    expect(result.map((m) => m.nom)).toEqual(["DUPONT", "LEROY", "MARTIN"]);
  });
});

describe("ListTeamMembersUseCase — filtre actif", () => {
  it("actif=true exclut les inactifs", async () => {
    await ctx.sql`
      INSERT INTO lic_team_members (nom, role_team, actif) VALUES ('OFF', 'SALES', false)
    `;
    const actives = await useCase.execute({ actif: true });
    expect(actives.find((m) => m.nom === "OFF")).toBeUndefined();
  });
});

describe("ListTeamMembersUseCase — filtre roleTeam", () => {
  it("ne retourne que les SALES", async () => {
    await seedThree();
    const sales = await useCase.execute({ roleTeam: "SALES" });
    expect(sales.map((m) => m.nom)).toEqual(["DUPONT"]);
    expect(sales.every((m) => m.roleTeam === "SALES")).toBe(true);
  });

  it("ne retourne que les DM", async () => {
    await seedThree();
    const dm = await useCase.execute({ roleTeam: "DM" });
    expect(dm.map((m) => m.nom)).toEqual(["LEROY"]);
  });
});

describe("ListTeamMembersUseCase — filtre regionCode", () => {
  it("ne retourne que les membres NORD_AFRIQUE", async () => {
    await seedThree();
    const nord = await useCase.execute({ regionCode: "NORD_AFRIQUE" });
    expect(nord.map((m) => m.nom)).toEqual(["DUPONT", "LEROY"]);
  });
});

describe("ListTeamMembersUseCase — combinaison filtres", () => {
  it("roleTeam=DM + regionCode=NORD_AFRIQUE → 1 résultat", async () => {
    await seedThree();
    const result = await useCase.execute({ roleTeam: "DM", regionCode: "NORD_AFRIQUE" });
    expect(result).toHaveLength(1);
    expect(result[0]?.nom).toBe("LEROY");
  });

  it("roleTeam=SALES + regionCode=AFRIQUE_OUEST → 0 résultat (Alice est NORD_AFRIQUE)", async () => {
    await seedThree();
    const result = await useCase.execute({ roleTeam: "SALES", regionCode: "AFRIQUE_OUEST" });
    expect(result).toEqual([]);
  });
});

describe("ListTeamMembersUseCase — DTO output", () => {
  it("retourne TeamMemberDTO avec dateCreation ISO et nullables corrects", async () => {
    await ctx.sql`INSERT INTO lic_team_members (nom, role_team) VALUES ('TEST', 'SALES')`;
    const result = await useCase.execute();
    const sample = result[0];
    expect(sample).toBeDefined();
    expect(typeof sample?.id).toBe("number");
    expect(sample?.prenom).toBeNull();
    expect(sample?.email).toBeNull();
    expect(sample?.regionCode).toBeNull();
    expect(typeof sample?.dateCreation).toBe("string");
    expect(new Date(sample?.dateCreation ?? "").toString()).not.toBe("Invalid Date");
  });
});
