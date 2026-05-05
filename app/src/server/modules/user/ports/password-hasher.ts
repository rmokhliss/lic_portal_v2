// ==============================================================================
// LIC v2 — Port PasswordHasher (Phase 15 — audit Master 5.1 / Référentiel v2.1)
//
// Surface 2 méthodes : hash() pour persister, verify() pour comparer un mdp
// clair contre un hash stocké. Pattern port + adapter aligné EmailSender
// Phase 14 — découpe la dépendance bcryptjs hors de la couche application/.
//
// Adapters :
//   - BcryptPasswordHasher : prod (bcryptjs avec cost configurable env).
//   - MockPasswordHasher    : tests (déterministe, gain perf significatif).
// ==============================================================================

export abstract class PasswordHasher {
  abstract hash(plaintext: string): Promise<string>;
  abstract verify(plaintext: string, hashStored: string): Promise<boolean>;
}
