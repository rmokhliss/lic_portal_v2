// ==============================================================================
// LIC v2 — Test d'intégration FTS français lic_audit_log (F-08)
//
// Vérifie le comportement réel du dictionnaire `french` natif PostgreSQL :
//   - Stemmer FR : pluriel/singulier/verbe (modification(s)/modifié → racine "modifi")
//   - Mots accentués (André) : seul match exact (FR natif ne normalise pas)
//   - Mots anglais dans corpus FR (password) : tokenisés tels quels
//
// Si comportement surprenant en exécution → ADR + extension `unaccent` à
// envisager F-09+.
//
// Insertion SQL brute (pas via use-case) pour contrôler le payload exact des
// 5 entrées variantes. search_vector calculé automatiquement par le GENERATED
// ALWAYS STORED côté BD (cf. F-06 migration).
// ==============================================================================

import { afterAll, describe, expect, it, vi } from "vitest";

import "../../../../../../../scripts/load-env";

vi.mock("server-only", () => ({}));

import { SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createTestDb, setupTransactionalTests } from "@/server/infrastructure/db/test-helpers";

const ctx = createTestDb();

afterAll(async () => {
  await ctx.close();
});

setupTransactionalTests(ctx);

const ID_1 = "01928c8e-1111-aaaa-bbbb-cccc00000001";
const ID_2 = "01928c8e-1111-aaaa-bbbb-cccc00000002";
const ID_3 = "01928c8e-1111-aaaa-bbbb-cccc00000003";
const ID_4 = "01928c8e-1111-aaaa-bbbb-cccc00000004";
const ID_5 = "01928c8e-1111-aaaa-bbbb-cccc00000005";

async function seedFiveVariants(): Promise<void> {
  await ctx.sql`
    INSERT INTO lic_audit_log (entity, entity_id, action, user_id, user_display, mode) VALUES
      ('licence', ${ID_1}, 'MODIFICATIONS', ${SYSTEM_USER_ID}, 'Système (SYS-000)', 'JOB'),
      ('licence', ${ID_2}, 'MODIFICATION',  ${SYSTEM_USER_ID}, 'Système (SYS-000)', 'JOB'),
      ('user',    ${ID_3}, 'MODIFIE',       ${SYSTEM_USER_ID}, 'Système (SYS-000)', 'JOB'),
      ('client',  ${ID_4}, 'CREATE',        ${SYSTEM_USER_ID}, 'André DUPRÉ (MAT-099)', 'MANUEL'),
      ('user',    ${ID_5}, 'PASSWORD_CHANGED', ${SYSTEM_USER_ID}, 'Sébastien MULLER (MAT-100)', 'MANUEL')
  `;
}

async function ftsMatch(query: string): Promise<string[]> {
  const rows = await ctx.sql<{ entity_id: string }[]>`
    SELECT entity_id FROM lic_audit_log
    WHERE search_vector @@ plainto_tsquery('french', ${query})
    ORDER BY entity_id
  `;
  return rows.map((r) => r.entity_id);
}

describe("FTS français — stemmer pluriel/singulier/verbe", () => {
  it('"modification" matche MODIFICATION + MODIFICATIONS + MODIFIE (racine "modifi")', async () => {
    await seedFiveVariants();
    const ids = await ftsMatch("modification");
    expect(ids).toEqual(expect.arrayContaining([ID_1, ID_2, ID_3]));
    expect(ids).not.toContain(ID_4);
    expect(ids).not.toContain(ID_5);
  });

  it('"modifié" (accentué) ne matche PAS MODIFICATION/MODIFICATIONS/MODIFIE — comportement observé : dictionnaire FR natif ne normalise pas les accents en mode requête (extension `unaccent` requise pour symétrie accent/non-accent — ADR F-09+ si bloquant)', async () => {
    await seedFiveVariants();
    const ids = await ftsMatch("modifié");
    expect(ids).toHaveLength(0);
  });
});

describe("FTS français — accents nom propre", () => {
  it('"André" matche l\'entrée 4 (user_display "André DUPRÉ")', async () => {
    await seedFiveVariants();
    const ids = await ftsMatch("André");
    expect(ids).toContain(ID_4);
  });

  it('"Andre" sans accent : assertion ferme — Dictionnaire FR natif ne normalise pas les accents → 0 résultat. Si fail (= match obtenu), ajuster + ADR + extension unaccent à F-09+.', async () => {
    await seedFiveVariants();
    const ids = await ftsMatch("Andre");
    expect(ids).toHaveLength(0);
  });
});

describe("FTS français — mot anglais dans corpus FR", () => {
  it('"password" matche PASSWORD_CHANGED de l\'entrée 5 (tokenisation simple)', async () => {
    await seedFiveVariants();
    const ids = await ftsMatch("password");
    expect(ids).toContain(ID_5);
  });
});
