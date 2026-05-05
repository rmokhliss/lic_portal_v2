// ==============================================================================
// LIC v2 — Adapter PasswordHasher mock (Phase 15 — pour tests d'intégration)
//
// Hash déterministe `mock:<plaintext>` au lieu d'un vrai bcrypt. Évite le coût
// CPU des hash bcryptjs (cost 10 ≈ 100 ms) sur les tests qui n'ont pas besoin
// de tester la primitive crypto elle-même.
//
// SÉCURITÉ : ne JAMAIS injecter cet adapter en production. Le composition-root
// utilise BcryptPasswordHasher uniquement (cf. composition-root.ts).
// ==============================================================================

import { PasswordHasher } from "../../ports/password-hasher";

export class MockPasswordHasher extends PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return Promise.resolve(`mock:${plaintext}`);
  }

  verify(plaintext: string, hashStored: string): Promise<boolean> {
    return Promise.resolve(hashStored === `mock:${plaintext}`);
  }
}
