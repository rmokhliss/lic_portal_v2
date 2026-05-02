// ==============================================================================
// LIC v2 — Tests unitaires des helpers auth (F-07)
//
// Mock de `auth()` (NextAuth) pour simuler les différents états de session.
// Mock de `redirect()` pour intercepter les redirects sans crasher Vitest.
//
// Pourquoi load-env en tête : avec singleFork (vitest.config), tous les tests
// partagent le MÊME process.env. Si on override DATABASE_URL ici, on casse les
// tests d'intégration BD. On charge donc la vraie URL .env, et les mocks
// postgres/drizzle plus bas garantissent qu'aucune connexion réelle n'est faite.
// ==============================================================================

import "../../../../../scripts/load-env";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock complet de next-auth. importOriginal() ne marche pas ici parce que
// next-auth charge `next/server` (non résolvable hors runtime Next.js).
// On reproduit la forme minimale dont config.ts a besoin (CredentialsSignin
// + default NextAuth() qui retourne handlers/auth/signIn/signOut).
const authMock = vi.fn();
vi.mock("next-auth", () => {
  class MockCredentialsSignin extends Error {
    code = "default";
  }
  return {
    default: vi.fn(() => ({
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: authMock,
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    CredentialsSignin: MockCredentialsSignin,
  };
});

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({ id: "credentials", type: "credentials" })),
}));

// Mock next/navigation redirect pour qu'il throw une sentinelle traçable
class RedirectSentinel extends Error {
  constructor(public readonly to: string) {
    super(`__REDIRECT__:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new RedirectSentinel(to);
  }),
}));

// Mock server-only (server-only module Next.js, pas résolvable en test)
vi.mock("server-only", () => ({}));

// Mock postgres + drizzle pour éviter toute connexion BD
vi.mock("postgres", () => {
  function fakeTag(): Promise<unknown[]> {
    return Promise.resolve([]);
  }
  const fakeSql = Object.assign(fakeTag, {
    end: vi.fn().mockResolvedValue(undefined),
  });
  return { default: vi.fn(() => fakeSql) };
});
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  })),
}));

beforeEach(() => {
  // On NE touche PAS DATABASE_URL/AUTH_SECRET/APP_MASTER_KEY (chargés par
  // load-env). Reset uniquement le mock auth().
  process.env = {
    ...process.env,
  };
  authMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

const SAMPLE_USER = {
  id: "01928c8e-aaaa-bbbb-cccc-ddddeeee0001",
  email: "alice@s2m.local",
  matricule: "MAT-042",
  nom: "Dupont",
  prenom: "Alice",
  display: "Alice DUPONT (MAT-042)",
  role: "ADMIN" as const,
  mustChangePassword: false,
  tokenVersion: 1,
};

describe("requireAuth", () => {
  it("retourne l'user quand session valide", async () => {
    authMock.mockResolvedValueOnce({ user: SAMPLE_USER });
    const { requireAuth } = await import("../index");
    await expect(requireAuth()).resolves.toMatchObject({ id: SAMPLE_USER.id });
  });

  it("throw UnauthorizedError SPX-LIC-001 quand pas de session", async () => {
    authMock.mockResolvedValueOnce(null);
    const { requireAuth } = await import("../index");
    await expect(requireAuth()).rejects.toMatchObject({ code: "SPX-LIC-001" });
  });
});

describe("requireAuthPage", () => {
  it("retourne l'user quand session valide et pas mustChangePassword", async () => {
    authMock.mockResolvedValueOnce({ user: SAMPLE_USER });
    const { requireAuthPage } = await import("../index");
    await expect(requireAuthPage()).resolves.toMatchObject({ id: SAMPLE_USER.id });
  });

  it("redirect /login quand pas de session", async () => {
    authMock.mockResolvedValueOnce(null);
    const { requireAuthPage } = await import("../index");
    await expect(requireAuthPage()).rejects.toMatchObject({ to: "/login" });
  });

  it("redirect /profile/change-password quand mustChangePassword=true", async () => {
    authMock.mockResolvedValueOnce({
      user: { ...SAMPLE_USER, mustChangePassword: true },
    });
    const { requireAuthPage } = await import("../index");
    await expect(requireAuthPage()).rejects.toMatchObject({
      to: "/profile/change-password",
    });
  });
});

describe("requireAuthForChangePassword", () => {
  it("retourne l'user MEME si mustChangePassword=true (pas de redirect, évite boucle)", async () => {
    authMock.mockResolvedValueOnce({
      user: { ...SAMPLE_USER, mustChangePassword: true },
    });
    const { requireAuthForChangePassword } = await import("../index");
    await expect(requireAuthForChangePassword()).resolves.toMatchObject({
      mustChangePassword: true,
    });
  });

  it("redirect /login quand pas de session", async () => {
    authMock.mockResolvedValueOnce(null);
    const { requireAuthForChangePassword } = await import("../index");
    await expect(requireAuthForChangePassword()).rejects.toMatchObject({
      to: "/login",
    });
  });
});

describe("requireRole", () => {
  it("retourne l'user quand role inclus", async () => {
    authMock.mockResolvedValueOnce({ user: SAMPLE_USER });
    const { requireRole } = await import("../index");
    await expect(requireRole(["ADMIN", "SADMIN"])).resolves.toMatchObject({
      role: "ADMIN",
    });
  });

  it("throw ForbiddenError SPX-LIC-003 quand role insuffisant", async () => {
    authMock.mockResolvedValueOnce({ user: { ...SAMPLE_USER, role: "USER" } });
    const { requireRole } = await import("../index");
    await expect(requireRole(["ADMIN", "SADMIN"])).rejects.toMatchObject({
      code: "SPX-LIC-003",
    });
  });
});

describe("requireRolePage", () => {
  it("redirect / (gracieux L14) quand role insuffisant", async () => {
    authMock.mockResolvedValueOnce({ user: { ...SAMPLE_USER, role: "USER" } });
    const { requireRolePage } = await import("../index");
    await expect(requireRolePage(["SADMIN"])).rejects.toMatchObject({ to: "/" });
  });
});

describe("getCurrentUser", () => {
  it("retourne user quand session valide", async () => {
    authMock.mockResolvedValueOnce({ user: SAMPLE_USER });
    const { getCurrentUser } = await import("../index");
    await expect(getCurrentUser()).resolves.toMatchObject({ id: SAMPLE_USER.id });
  });

  it("retourne null quand pas de session (pas de throw, pas de redirect)", async () => {
    authMock.mockResolvedValueOnce(null);
    const { getCurrentUser } = await import("../index");
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
