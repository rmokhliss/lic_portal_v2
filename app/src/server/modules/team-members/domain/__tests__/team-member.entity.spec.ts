// Tests unitaires TeamMember (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import {
  PersistedTeamMember,
  TeamMember,
  type CreateTeamMemberInput,
  type RoleTeam,
} from "../team-member.entity";

const VALID_INPUT: CreateTeamMemberInput = {
  nom: "DUPONT",
  prenom: "Alice",
  email: "alice@s2m.com",
  telephone: "+33612345678",
  roleTeam: "SALES",
  regionCode: "NORD_AFRIQUE",
};

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("TeamMember.create — cas nominaux", () => {
  it("retourne un TeamMember valide pour input complet", () => {
    const m = TeamMember.create(VALID_INPUT);
    expect(m.nom).toBe("DUPONT");
    expect(m.prenom).toBe("Alice");
    expect(m.email).toBe("alice@s2m.com");
    expect(m.roleTeam).toBe("SALES");
    expect(m.regionCode).toBe("NORD_AFRIQUE");
    expect(m.actif).toBe(true);
  });

  it("accepte input minimal (nom + roleTeam seuls)", () => {
    const m = TeamMember.create({ nom: "TEST", roleTeam: "DM" });
    expect(m.nom).toBe("TEST");
    expect(m.prenom).toBeUndefined();
    expect(m.email).toBeUndefined();
    expect(m.regionCode).toBeUndefined();
  });

  it("accepte les 3 roleTeam : SALES, AM, DM", () => {
    expect(TeamMember.create({ nom: "X", roleTeam: "SALES" }).roleTeam).toBe("SALES");
    expect(TeamMember.create({ nom: "X", roleTeam: "AM" }).roleTeam).toBe("AM");
    expect(TeamMember.create({ nom: "X", roleTeam: "DM" }).roleTeam).toBe("DM");
  });
});

describe("TeamMember.create — invariants throw SPX-LIC-717", () => {
  it.each<readonly [string, Partial<CreateTeamMemberInput>]>([
    ["nom vide", { nom: "" }],
    ["nom > 100 chars", { nom: "x".repeat(101) }],
    ["prenom chaîne vide", { prenom: "" }],
    ["prenom > 100 chars", { prenom: "x".repeat(101) }],
    ["email chaîne vide", { email: "" }],
    ["email sans @", { email: "alice.s2m.com" }],
    ["email sans domaine", { email: "alice@" }],
    ["email avec espace", { email: "alice @s2m.com" }],
    ["email > 200 chars", { email: `${"x".repeat(195)}@s2m.com` }],
    ["telephone chaîne vide", { telephone: "" }],
    ["telephone > 20 chars", { telephone: "+".concat("1".repeat(20)) }],
    ["roleTeam invalide", { roleTeam: "BOSS" as RoleTeam }],
    ["regionCode chaîne vide", { regionCode: "" }],
    ["regionCode minuscules", { regionCode: "nord" }],
    ["regionCode > 50 chars", { regionCode: "A".repeat(51) }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => TeamMember.create({ ...VALID_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });
});

describe("TeamMember.rehydrate", () => {
  it("reconstruit une PersistedTeamMember", () => {
    const date = new Date("2026-05-01T10:00:00Z");
    const m = TeamMember.rehydrate({
      id: 42,
      nom: "DUPONT",
      prenom: "Alice",
      roleTeam: "SALES",
      actif: true,
      dateCreation: date,
    });
    expect(m).toBeInstanceOf(PersistedTeamMember);
    expect(m.id).toBe(42);
    expect(m.dateCreation).toBe(date);
  });
});

describe("PersistedTeamMember — withPatch", () => {
  const persisted = TeamMember.rehydrate({
    id: 1,
    nom: "DUPONT",
    prenom: "Alice",
    email: "alice@s2m.com",
    telephone: "+33612345678",
    roleTeam: "SALES",
    regionCode: "NORD_AFRIQUE",
    actif: true,
    dateCreation: new Date(),
  });

  it("nom remplace", () => {
    expect(persisted.withPatch({ nom: "MARTIN" }).nom).toBe("MARTIN");
  });

  it("prenom=null efface", () => {
    expect(persisted.withPatch({ prenom: null }).prenom).toBeUndefined();
  });

  it("email=undefined (absent) → inchangé", () => {
    const u = persisted.withPatch({ nom: "MARTIN" });
    expect(u.email).toBe("alice@s2m.com");
  });

  it("roleTeam SALES → DM", () => {
    expect(persisted.withPatch({ roleTeam: "DM" }).roleTeam).toBe("DM");
  });

  it("regionCode=null efface", () => {
    expect(persisted.withPatch({ regionCode: null }).regionCode).toBeUndefined();
  });

  it("rejette nom vide (SPX-LIC-717)", () => {
    const thrown = captureThrown(() => persisted.withPatch({ nom: "" }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });

  it("rejette email format invalide", () => {
    const thrown = captureThrown(() => persisted.withPatch({ email: "pasunemail" }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });

  it("rejette roleTeam invalide", () => {
    const thrown = captureThrown(() => persisted.withPatch({ roleTeam: "X" as RoleTeam }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });

  it("withPatch valide telephone si remplacé", () => {
    const u = persisted.withPatch({ telephone: "+33700000000" });
    expect(u.telephone).toBe("+33700000000");
    const thrown = captureThrown(() => persisted.withPatch({ telephone: "x".repeat(21) }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });

  it("withPatch valide regionCode si remplacé", () => {
    const u = persisted.withPatch({ regionCode: "AFRIQUE_OUEST" });
    expect(u.regionCode).toBe("AFRIQUE_OUEST");
    const thrown = captureThrown(() => persisted.withPatch({ regionCode: "invalid" }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-717" });
  });
});

describe("PersistedTeamMember — toggle", () => {
  const persisted = TeamMember.rehydrate({
    id: 1,
    nom: "DUPONT",
    roleTeam: "SALES",
    actif: true,
    dateCreation: new Date(),
  });

  it("bascule actif", () => {
    expect(persisted.toggle().actif).toBe(false);
    expect(persisted.toggle().toggle().actif).toBe(true);
  });
});

describe("toAuditSnapshot", () => {
  it("inclut tous les champs", () => {
    const m = TeamMember.create(VALID_INPUT);
    expect(m.toAuditSnapshot()).toEqual({
      nom: "DUPONT",
      prenom: "Alice",
      email: "alice@s2m.com",
      telephone: "+33612345678",
      roleTeam: "SALES",
      regionCode: "NORD_AFRIQUE",
      actif: true,
    });
  });

  it("PersistedTeamMember ajoute id", () => {
    const m = TeamMember.rehydrate({
      id: 7,
      nom: "MARTIN",
      roleTeam: "AM",
      actif: true,
      dateCreation: new Date(),
    });
    expect(m.toAuditSnapshot()).toMatchObject({ id: 7, prenom: null, regionCode: null });
  });
});
