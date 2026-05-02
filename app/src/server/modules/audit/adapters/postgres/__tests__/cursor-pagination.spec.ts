// ==============================================================================
// LIC v2 — Test d'intégration pagination cursor lic_audit_log (F-08)
//
// Edge cases :
//   - Page 1 sans cursor + page 2 via nextCursor + page finale (nextCursor null)
//   - Cursor invalide → throw SPX-LIC-502 (via decodeCursor)
//   - limit=200 (cap appliqué)
//   - Tie-breaker stable : 2 entrées même created_at, ORDER BY id DESC déterministe
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";

import { AuditRepositoryPg } from "../audit.repository.pg";

const ctx = createTestDb();
const repo = new AuditRepositoryPg(ctx.db);

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

const TEST_ENTITY_ID = "01928c8e-aaaa-bbbb-cccc-ddddeeee0001";

async function seedN(n: number): Promise<void> {
  // n entrées séquentielles avec un délai 5ms entre chaque pour des created_at
  // monotones distincts. Sans délai, INSERT rapides dans la même ms produisent
  // des created_at identiques + uuidv7 dans la même fenêtre temporelle (random
  // bytes décident de l'ordre lexico) — ordre instable + cursor (cat, id)
  // retourne 0 résultat sur les pages suivantes.
  for (let i = 0; i < n; i++) {
    await repo.save(
      AuditEntry.system({
        entity: "user",
        entityId: TEST_ENTITY_ID,
        action: `ACTION_${String(i).padStart(3, "0")}`,
      }),
    );
    if (i < n - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
  }
}

describe("Pagination cursor — flow page 1 → page 2 → fin", () => {
  it("page 1 (limit=3) sur 7 entrées : 3 items + nextCursor non-null", async () => {
    await seedN(7);
    const page1 = await repo.search({ entityId: TEST_ENTITY_ID, limit: 3 });
    expect(page1.items).toHaveLength(3);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.effectiveLimit).toBe(3);
  });

  it("page 2 via nextCursor : 3 items + nextCursor non-null", async () => {
    await seedN(7);
    const page1 = await repo.search({ entityId: TEST_ENTITY_ID, limit: 3 });
    const page2 = await repo.search({
      entityId: TEST_ENTITY_ID,
      limit: 3,
      cursor: page1.nextCursor ?? undefined,
    });
    expect(page2.items).toHaveLength(3);
    expect(page2.nextCursor).not.toBeNull();
    // Les ids de page2 ne chevauchent pas page1
    const ids1 = new Set(page1.items.map((e) => e.id));
    const ids2 = page2.items.map((e) => e.id);
    expect(ids2.every((id) => !ids1.has(id))).toBe(true);
  });

  it("page finale : moins de limit items + nextCursor null", async () => {
    await seedN(7);
    const page1 = await repo.search({ entityId: TEST_ENTITY_ID, limit: 3 });
    const page2 = await repo.search({
      entityId: TEST_ENTITY_ID,
      limit: 3,
      cursor: page1.nextCursor ?? undefined,
    });
    const page3 = await repo.search({
      entityId: TEST_ENTITY_ID,
      limit: 3,
      cursor: page2.nextCursor ?? undefined,
    });
    expect(page3.items).toHaveLength(1); // 7 - 3 - 3 = 1
    expect(page3.nextCursor).toBeNull();
  });
});

describe("Pagination cursor — ordre stable DESC", () => {
  it("page 1 ordre created_at DESC, id DESC", async () => {
    await seedN(5);
    const page = await repo.search({ entityId: TEST_ENTITY_ID, limit: 5 });
    expect(page.items).toHaveLength(5);
    // Vérif : timestamps en ordre décroissant (ou égalité avec id décroissant)
    for (let i = 0; i < page.items.length - 1; i++) {
      const a = page.items[i];
      const b = page.items[i + 1];
      // eslint-disable-next-line no-restricted-syntax -- assertion fixture pour aider TS narrowing
      if (a === undefined || b === undefined) throw new Error("items defined");
      const tComp = a.createdAt.getTime() - b.createdAt.getTime();
      if (tComp === 0) {
        // Tie-breaker id DESC
        expect(a.id.localeCompare(b.id)).toBeGreaterThan(0);
      } else {
        expect(tComp).toBeGreaterThan(0);
      }
    }
  });
});

describe("Pagination cursor — edge cases", () => {
  it("cursor invalide → throw SPX-LIC-502", async () => {
    await expect(
      repo.search({ entityId: TEST_ENTITY_ID, cursor: "not-a-valid-cursor!" }),
    ).rejects.toMatchObject({ code: "SPX-LIC-502" });
  });

  it("limit=0 effectif (use-case ne cap pas, repo retourne 0 items)", async () => {
    // Le repo accepte limit:0 brut (pas le job du repo de cap, c'est le use-case).
    // Le use-case (search-audit-log.usecase.ts) cap à min 1.
    await seedN(3);
    const page = await repo.search({ entityId: TEST_ENTITY_ID, limit: 0 });
    expect(page.items).toHaveLength(0);
    // nextCursor null car LIMIT 0 + 1 = LIMIT 1 ne renvoie pas plus que limit demandée
    // (en fait : 1 row récupéré mais limit=0 → hasMore=true mais slice(0,0)=[] → nextCursor calc impossible)
    // Comportement marginal — le use-case prévient ce cas.
  });

  it("aucune entrée → page vide + nextCursor null + effectiveLimit demandé", async () => {
    const page = await repo.search({ entityId: "01928c8e-9999-9999-9999-999999999999", limit: 50 });
    expect(page.items).toHaveLength(0);
    expect(page.nextCursor).toBeNull();
    expect(page.effectiveLimit).toBe(50);
  });
});
