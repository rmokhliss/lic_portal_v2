// Tests comportementaux des helpers de colonnes (F-06).
// On vérifie l'API publique (présence des colonnes via getTableConfig + flags
// notNull/primary largement utilisés par la doc Drizzle), sans inspecter
// la valeur SQL interne des défauts (qui pourrait changer entre versions).

import { getTableConfig, pgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { createdAtOnly, primaryUuid, referenceUuid, timestamps } from "../columns";

describe("primaryUuid", () => {
  const testTable = pgTable("test_pk_table", {
    id: primaryUuid(),
  });

  it("expose une colonne 'id' sur la table", () => {
    expect(testTable.id).toBeDefined();
  });

  it("la colonne 'id' est primary key et non-null", () => {
    const config = getTableConfig(testTable);
    const idCol = config.columns.find((c) => c.name === "id");
    expect(idCol).toBeDefined();
    expect(idCol?.primary).toBe(true);
    expect(idCol?.notNull).toBe(true);
  });

  it("la colonne 'id' a une default value définie (truthy)", () => {
    const config = getTableConfig(testTable);
    const idCol = config.columns.find((c) => c.name === "id");
    expect(idCol?.default).toBeTruthy();
  });
});

describe("referenceUuid", () => {
  const parentTable = pgTable("test_parent_table", {
    id: primaryUuid(),
  });

  it("expose une colonne sous le name fourni", () => {
    const childTable = pgTable("test_child_nullable", {
      id: primaryUuid(),
      parentId: referenceUuid("parent_id", () => parentTable.id),
    });
    expect(childTable.parentId).toBeDefined();
  });

  it("retourne une colonne nullable par défaut (cohérent Drizzle)", () => {
    const childTable = pgTable("test_child_nullable_2", {
      id: primaryUuid(),
      parentId: referenceUuid("parent_id", () => parentTable.id),
    });
    const config = getTableConfig(childTable);
    const fkCol = config.columns.find((c) => c.name === "parent_id");
    expect(fkCol?.notNull).toBe(false);
  });

  it("supporte .notNull() chaîné au call site", () => {
    const childTable = pgTable("test_child_notnull", {
      id: primaryUuid(),
      parentId: referenceUuid("parent_id", () => parentTable.id).notNull(),
    });
    const config = getTableConfig(childTable);
    const fkCol = config.columns.find((c) => c.name === "parent_id");
    expect(fkCol?.notNull).toBe(true);
  });
});

describe("timestamps", () => {
  it("retourne un objet avec les clés 'createdAt' et 'updatedAt'", () => {
    const cols = timestamps();
    expect(cols).toHaveProperty("createdAt");
    expect(cols).toHaveProperty("updatedAt");
  });

  it("crée bien created_at + updated_at dans la table générée", () => {
    const testTable = pgTable("test_ts_table", {
      id: primaryUuid(),
      ...timestamps(),
    });
    const config = getTableConfig(testTable);

    const created = config.columns.find((c) => c.name === "created_at");
    const updated = config.columns.find((c) => c.name === "updated_at");

    expect(created).toBeDefined();
    expect(created?.notNull).toBe(true);
    expect(created?.default).toBeTruthy();

    expect(updated).toBeDefined();
    expect(updated?.notNull).toBe(true);
    expect(updated?.default).toBeTruthy();
  });
});

describe("createdAtOnly", () => {
  it("retourne un objet avec uniquement 'createdAt'", () => {
    const cols = createdAtOnly();
    expect(cols).toHaveProperty("createdAt");
    expect(cols).not.toHaveProperty("updatedAt");
  });

  it("crée bien created_at dans la table (notNull, default truthy)", () => {
    const testTable = pgTable("test_co_table", {
      id: primaryUuid(),
      ...createdAtOnly(),
    });
    const config = getTableConfig(testTable);
    const created = config.columns.find((c) => c.name === "created_at");

    expect(created).toBeDefined();
    expect(created?.notNull).toBe(true);
    expect(created?.default).toBeTruthy();
  });
});
