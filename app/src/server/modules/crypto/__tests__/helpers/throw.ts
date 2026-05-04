// ==============================================================================
// LIC v2 — Helper de test partagé (Phase 3.A.1+)
//
// `captureThrow` exécute `fn` et retourne l'exception levée (typée `unknown`)
// pour pouvoir l'asserter via `expect(thrown).toMatchObject({ code: "SPX-LIC-NNN" })`.
//
// Pourquoi pas `expect(...).toThrow(expect.objectContaining({...}))` ?
// `expect.objectContaining` retourne `any`, ce qui viole la règle ESLint
// `@typescript-eslint/no-unsafe-argument` du projet. Le pattern try/catch ici
// reste typé `unknown` jusqu'à `toMatchObject`.
//
// Usage :
//   expect(captureThrow(() => signPayload("hello", "garbage"))).toMatchObject({
//     code: "SPX-LIC-401",
//   });
// ==============================================================================

export function captureThrow(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  // eslint-disable-next-line no-restricted-syntax -- pré-condition test : fn doit throw
  throw new Error("Expected fn to throw, but it returned normally");
}
