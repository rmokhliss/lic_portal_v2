import { beforeAll, describe, expect, it, vi } from "vitest";

// `server-only` est un module spécial Next.js qui crashe à l'import depuis un
// bundle client. En test Vitest (env: "node"), il n'a pas de raison d'être
// résolu ; on le mocke en module vide pour permettre l'import de client.ts.
vi.mock("server-only", () => ({}));

// Mock postgres.js : aucune connexion réelle pendant le test d'export.
// `postgres()` retourne une fonction tag template avec méthodes attachées.
vi.mock("postgres", () => {
  function fakeTag(): Promise<unknown[]> {
    return Promise.resolve([]);
  }
  const fakeSql = Object.assign(fakeTag, {
    end: vi.fn().mockResolvedValue(undefined),
  });
  return { default: vi.fn(() => fakeSql) };
});

// Mock drizzle-orm/postgres-js : on court-circuite l'instanciation complète
// (qui inspecte client.options.parsers etc.). Cohérent avec l'objectif F-05 :
// tester les exports, pas l'intégration Drizzle (différée à F-06).
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  })),
}));

beforeAll(() => {
  process.env = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    AUTH_SECRET: "a".repeat(32),
    APP_MASTER_KEY: "b".repeat(32),
    LOG_LEVEL: "info",
  };
});

describe("infrastructure/db/client", () => {
  it("exports `db` comme objet non-null avec une méthode `select` Drizzle", async () => {
    const mod = await import("../client");
    expect(typeof mod.db).toBe("object");
    expect(mod.db).not.toBeNull();
    expect(typeof mod.db.select).toBe("function");
  });

  it("exports `sql` comme fonction (postgres.js tag template)", async () => {
    const mod = await import("../client");
    expect(typeof mod.sql).toBe("function");
  });

  it("singleton : deux imports retournent la même instance `db` et `sql`", async () => {
    const a = await import("../client");
    const b = await import("../client");
    expect(a.db).toBe(b.db);
    expect(a.sql).toBe(b.sql);
  });
});
