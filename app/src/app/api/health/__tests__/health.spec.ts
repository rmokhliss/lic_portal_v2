// ==============================================================================
// LIC v2 — Tests /api/health probes (Phase 15 — Référentiel v2.1 §4.19)
//
// Couvre :
//   - /live → 200 + uptime, AUCUN check DB (déterministe sans BD).
//   - /ready avec DB up → 200 + db: ok.
//   - /ready avec DB down → 503 + code SPX-LIC-900 (payload public only).
// ==============================================================================

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  const testEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://lic_portal:lic_portal_dev@localhost:5432/lic_portal",
    AUTH_SECRET: "a".repeat(32),
    APP_MASTER_KEY: "b".repeat(32),
    LOG_LEVEL: "fatal",
  };
  process.env = testEnv;
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("/api/health/live (Phase 15)", () => {
  it("returns 200 + uptime sans toucher à la BD", async () => {
    const { GET } = await import("../live/route");
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; uptime: number };
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("/api/health/ready (Phase 15)", () => {
  it("returns 200 + db ok quand SELECT 1 réussit", async () => {
    vi.doMock("@/server/infrastructure/db/client", () => ({
      sql: Object.assign(async (..._args: unknown[]) => Promise.resolve([{ "?column?": 1 }]), {}),
    }));
    const { GET } = await import("../ready/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; db: string };
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
  });

  it("returns 503 + code SPX-LIC-900 quand BD down (pas de fuite cause)", async () => {
    vi.doMock("@/server/infrastructure/db/client", () => {
      // eslint-disable-next-line no-restricted-syntax -- mock d'erreur runtime BD
      const dbError = new Error("connect ECONNREFUSED 127.0.0.1:5432 — host: secret-db.s2m.local");
      return {
        sql: Object.assign(async (..._args: unknown[]) => Promise.reject(dbError), {}),
      };
    });
    const { GET } = await import("../ready/route");
    const res = await GET();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { status: string; db: string; code: string };
    expect(body.status).toBe("ko");
    expect(body.db).toBe("error");
    expect(body.code).toBe("SPX-LIC-900");
    // Aucune fuite de cause / hostname dans le payload public
    const json = JSON.stringify(body);
    expect(json).not.toContain("ECONNREFUSED");
    expect(json).not.toContain("secret-db.s2m.local");
  });
});
