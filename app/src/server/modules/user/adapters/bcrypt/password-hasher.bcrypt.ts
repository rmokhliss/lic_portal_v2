// ==============================================================================
// LIC v2 — Adapter PasswordHasher bcryptjs (Phase 15 — audit Master 5.1)
//
// Implémentation prod du port PasswordHasher. Cost factor configurable via
// constructor (env.BCRYPT_COST, default 10 — aligné historique LIC v2 Phase 1).
// ==============================================================================

import bcryptjs from "bcryptjs";

import { PasswordHasher } from "../../ports/password-hasher";

export class BcryptPasswordHasher extends PasswordHasher {
  constructor(private readonly cost = 10) {
    super();
  }

  async hash(plaintext: string): Promise<string> {
    return bcryptjs.hash(plaintext, this.cost);
  }

  async verify(plaintext: string, hashStored: string): Promise<boolean> {
    return bcryptjs.compare(plaintext, hashStored);
  }
}
