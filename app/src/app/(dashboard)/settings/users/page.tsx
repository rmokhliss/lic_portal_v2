// ==============================================================================
// LIC v2 — /settings/users (Phase 2.B.bis EC-08)
//
// Server Component : fetch listUsersUseCase + résout currentUserId via
// requireRolePage (le settings/layout.tsx a déjà la garde SADMIN unique,
// mais on récupère l'user pour la règle self-deactivation côté UI). Passe
// le tout à SettingsUsersTable Client Component.
//
// Pas de Server Action pour la lecture (cf. décision Stop 2 C.5 — pattern
// cohérent avec /settings/team étape 7).
// ==============================================================================

import { requireRolePage } from "@/server/infrastructure/auth";
import { listUsersUseCase } from "@/server/composition-root";

import { SettingsUsersTable } from "../_components/SettingsUsersTable";

export default async function SettingsUsersPage() {
  const currentUser = await requireRolePage(["SADMIN"]);
  const users = await listUsersUseCase.execute();

  return <SettingsUsersTable rows={users} currentUserId={currentUser.id} />;
}
