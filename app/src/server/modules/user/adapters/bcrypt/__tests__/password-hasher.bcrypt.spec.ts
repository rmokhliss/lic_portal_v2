// ==============================================================================
// LIC v2 — Tests adapter PasswordHasher bcryptjs (Phase 15 — audit Master 5.1)
// ==============================================================================

import { describe, expect, it } from "vitest";

import { BcryptPasswordHasher } from "../password-hasher.bcrypt";

describe("BcryptPasswordHasher", () => {
  it("round-trip hash → verify retourne true sur le bon mot de passe", async () => {
    const hasher = new BcryptPasswordHasher(4); // cost min pour test rapide
    const hash = await hasher.hash("Password-2026!");
    expect(hash).not.toBe("Password-2026!"); // hash ≠ plaintext
    expect(hash).toMatch(/^\$2[aby]\$/); // format bcrypt
    expect(await hasher.verify("Password-2026!", hash)).toBe(true);
  });

  it("verify retourne false sur un mauvais mot de passe", async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash("Password-2026!");
    expect(await hasher.verify("Wrong-Password", hash)).toBe(false);
    expect(await hasher.verify("password-2026!", hash)).toBe(false); // case-sensitive
  });
});
