// ==============================================================================
// LIC v2 — ActionResult tagué pour Server Actions (Phase 23 R-45 généralisé)
//
// Pourquoi : Next.js 16 anonymise les erreurs throwées par une Server Action.
// Côté client le `try/catch (err)` ne reçoit qu'un message digest opaque, le
// message AppError métier (ConflictError, ValidationError, …) est perdu.
//
// Pattern : toute Server Action mutatrice doit retourner un Result tagué via
// le helper `runAction(fn)` ci-dessous, qui catch les AppError et les
// convertit en `{ success: false, error, code }`. Les erreurs systèmes
// (DB down, panne réseau, bug TypeScript) continuent de throw → bannière
// 500 Next.js standard.
//
// Usage :
//
//   export async function createXAction(input: unknown): Promise<ActionResult<X>> {
//     return runAction(async () => {
//       const actor = await requireRole(["ADMIN", "SADMIN"]);
//       const parsed = Schema.parse(input);
//       const result = await xUseCase.execute(parsed, actor.id);
//       revalidatePath("/x");
//       return result;
//     });
//   }
//
// Côté client :
//
//   const r = await createXAction(payload);
//   if (r.success) { setError(""); onClose(); }
//   else { setError(r.error); }   // message AppError préservé
// ==============================================================================

import { AppError } from "@/server/modules/error";

export type ActionResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: string; readonly code?: string };

/** Exécute la fonction et catch les AppError métier en Result.failure.
 *  Re-throw les erreurs non-AppError (Zod, système, programmation) — Next.js
 *  les digest comme avant (acceptable car ce sont des cas non-prévus). */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: err.message, code: err.code };
    }
    throw err;
  }
}
