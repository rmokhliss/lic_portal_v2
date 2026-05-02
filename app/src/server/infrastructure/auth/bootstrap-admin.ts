// ==============================================================================
// LIC v2 — Bootstrap admin initial (F-07)
//
// Helper idempotent appelé par instrumentation.ts au boot Node runtime.
//
// Logique :
//   - Si une des 3 vars INITIAL_ADMIN_* manque → skip (debug log)
//   - Si lic_users contient déjà ≥1 SADMIN actif=true → skip (debug log)
//     (le seed SYSTEM F-06 est actif=false, donc il ne bloque pas)
//   - Sinon : INSERT user SADMIN (must_change_password=true, actif=true)
// ==============================================================================

import bcryptjs from "bcryptjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/server/infrastructure/db/client";
import { env } from "@/server/infrastructure/env";
import { createChildLogger } from "@/server/infrastructure/logger";
import { users } from "@/server/modules/user/adapters/postgres/schema";

const log = createChildLogger("bootstrap-admin");

const BCRYPT_COST = 10;

export async function bootstrapAdmin(): Promise<void> {
  // 1. Check 3 env vars (déjà validées all-or-none par le refine de env)
  if (
    env.INITIAL_ADMIN_EMAIL === undefined ||
    env.INITIAL_ADMIN_PASSWORD === undefined ||
    env.INITIAL_ADMIN_MATRICULE === undefined
  ) {
    log.debug("Bootstrap admin skip — INITIAL_ADMIN_* env vars absentes");
    return;
  }

  // 2. Check absence de SADMIN actif (règle L11 + sécurité critique brief F-07)
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "SADMIN"), eq(users.actif, true)))
    .limit(1);

  if (existing.length > 0) {
    log.debug("Bootstrap admin skip — un SADMIN actif existe déjà");
    return;
  }

  // 3. INSERT
  const passwordHash = await bcryptjs.hash(env.INITIAL_ADMIN_PASSWORD, BCRYPT_COST);

  await db.insert(users).values({
    matricule: env.INITIAL_ADMIN_MATRICULE,
    nom: "Admin",
    prenom: "Initial",
    email: env.INITIAL_ADMIN_EMAIL,
    passwordHash,
    mustChangePassword: true,
    role: "SADMIN",
    actif: true,
  });

  log.info(
    { matricule: env.INITIAL_ADMIN_MATRICULE, email: env.INITIAL_ADMIN_EMAIL },
    "Bootstrap admin initial créé (SADMIN, must_change_password=true)",
  );
}
