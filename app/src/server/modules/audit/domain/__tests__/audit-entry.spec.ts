// Tests unitaires AuditEntry (domain pur, aucune BD).

import { describe, expect, it } from "vitest";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { AuditEntry, type CreateAuditEntryInput, PersistedAuditEntry } from "../audit-entry.entity";

const VALID_HUMAN_INPUT: CreateAuditEntryInput = {
  entity: "user",
  entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
  action: "PASSWORD_CHANGED",
  userId: "01928c8e-bbbb-cccc-dddd-eeeeffff0002",
  userDisplay: "Alice DUPONT (MAT-042)",
  mode: "MANUEL",
};

describe("AuditEntry.create — cas nominaux", () => {
  it("retourne une AuditEntry valide pour un input humain complet", () => {
    const entry = AuditEntry.create(VALID_HUMAN_INPUT);
    expect(entry).toBeInstanceOf(AuditEntry);
    expect(entry.entity).toBe("user");
    expect(entry.userId).toBe(VALID_HUMAN_INPUT.userId);
    expect(entry.userDisplay).toBe("Alice DUPONT (MAT-042)");
    expect(entry.mode).toBe("MANUEL");
  });

  it("accepte les champs optionnels (beforeData, afterData, clientId, ipAddress, metadata)", () => {
    const entry = AuditEntry.create({
      ...VALID_HUMAN_INPUT,
      beforeData: { foo: 1 },
      afterData: { foo: 2 },
      clientId: "01928c8e-cccc-dddd-eeee-ffff00000003",
      clientDisplay: "Attijariwafa Bank",
      ipAddress: "192.168.1.42",
      metadata: { source: "test" },
    });
    expect(entry.beforeData).toEqual({ foo: 1 });
    expect(entry.clientId).toBe("01928c8e-cccc-dddd-eeee-ffff00000003");
    expect(entry.ipAddress).toBe("192.168.1.42");
  });

  it("accepte une adresse IPv6", () => {
    const entry = AuditEntry.create({
      ...VALID_HUMAN_INPUT,
      ipAddress: "2001:db8::1",
    });
    expect(entry.ipAddress).toBe("2001:db8::1");
  });

  it("accepte userId === SYSTEM_USER_ID sans userDisplay (cas job)", () => {
    const entry = AuditEntry.create({
      ...VALID_HUMAN_INPUT,
      userId: SYSTEM_USER_ID,
      userDisplay: undefined,
      mode: "JOB",
    });
    expect(entry.userId).toBe(SYSTEM_USER_ID);
    expect(entry.userDisplay).toBeUndefined();
  });
});

function captureThrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e: unknown) {
    return e;
  }
  return undefined;
}

describe("AuditEntry.create — invariants throw SPX-LIC-500", () => {
  it.each<readonly [string, Partial<CreateAuditEntryInput>]>([
    ["entity vide", { entity: "" }],
    ["entityId vide", { entityId: "" }],
    ["action vide", { action: "" }],
    ["userId vide", { userId: "" }],
    ["mode invalide 'OTHER'", { mode: "OTHER" as never }],
  ])("rejette quand %s", (_label, override) => {
    const thrown = captureThrown(() => AuditEntry.create({ ...VALID_HUMAN_INPUT, ...override }));
    expect(thrown).toMatchObject({ code: "SPX-LIC-500" });
  });

  it("rejette ipAddress invalide (texte non IP)", () => {
    const thrown = captureThrown(() =>
      AuditEntry.create({ ...VALID_HUMAN_INPUT, ipAddress: "not-an-ip" }),
    );
    expect(thrown).toMatchObject({ code: "SPX-LIC-500" });
  });

  it("rejette userId humain sans userDisplay", () => {
    const thrown = captureThrown(() =>
      AuditEntry.create({ ...VALID_HUMAN_INPUT, userDisplay: undefined }),
    );
    expect(thrown).toMatchObject({ code: "SPX-LIC-500" });
    expect((thrown as { message: string }).message).toContain("userDisplay");
  });

  it("rejette clientId présent sans clientDisplay", () => {
    const thrown = captureThrown(() =>
      AuditEntry.create({
        ...VALID_HUMAN_INPUT,
        clientId: "01928c8e-cccc-dddd-eeee-ffff00000003",
      }),
    );
    expect(thrown).toMatchObject({ code: "SPX-LIC-500" });
    expect((thrown as { message: string }).message).toContain("clientDisplay");
  });
});

describe("AuditEntry.system", () => {
  it("force userId=SYSTEM, userDisplay='Système (SYS-000)', mode='JOB'", () => {
    const entry = AuditEntry.system({
      entity: "licence",
      entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
      action: "EXPIRED_AUTO",
      beforeData: { statut: "ACTIVE" },
      afterData: { statut: "EXPIRE" },
    });
    expect(entry.userId).toBe(SYSTEM_USER_ID);
    expect(entry.userDisplay).toBe(SYSTEM_USER_DISPLAY);
    expect(entry.mode).toBe("JOB");
  });

  it("propage les champs métier (entity, action, before/after)", () => {
    const entry = AuditEntry.system({
      entity: "licence",
      entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
      action: "EXPIRED_AUTO",
      metadata: { jobName: "expire-licences" },
    });
    expect(entry.entity).toBe("licence");
    expect(entry.action).toBe("EXPIRED_AUTO");
    expect(entry.metadata).toEqual({ jobName: "expire-licences" });
  });
});

describe("AuditEntry.rehydrate", () => {
  it("retourne PersistedAuditEntry avec id + createdAt non-optionnels", () => {
    const id = "01928c8e-1111-2222-3333-444455556666";
    const createdAt = new Date("2026-05-02T10:30:00Z");
    const entry = AuditEntry.rehydrate({
      ...VALID_HUMAN_INPUT,
      id,
      createdAt,
    });
    expect(entry).toBeInstanceOf(PersistedAuditEntry);
    expect(entry).toBeInstanceOf(AuditEntry);
    expect(entry.id).toBe(id);
    expect(entry.createdAt.getTime()).toBe(createdAt.getTime());
  });

  it("ne valide PAS les invariants (BD = source de vérité)", () => {
    // Même un input qui ferait échouer create() doit passer en rehydrate
    // (cas hypothétique : ancien data en BD, format relâché).
    const entry = AuditEntry.rehydrate({
      entity: "user",
      entityId: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
      action: "X",
      userId: "01928c8e-bbbb-cccc-dddd-eeeeffff0002",
      // userDisplay manquant — refusé par create() mais accepté par rehydrate
      mode: "MANUEL",
      id: "01928c8e-9999-8888-7777-666655554444",
      createdAt: new Date(),
    });
    expect(entry.userDisplay).toBeUndefined();
  });
});
