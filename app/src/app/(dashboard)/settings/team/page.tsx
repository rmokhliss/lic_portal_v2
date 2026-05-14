// ==============================================================================
// LIC v2 — /settings/team (Phase 2.B étape 7/7)
//
// Server Component : fetch en parallèle les 6 listes (use-cases ré-exportés
// par composition-root.ts) puis passe les DTOs au Client Component qui rend
// les 6 sous-onglets. Pas de pagination — référentiels paramétrables à
// volume <200 lignes (ADR 0017 + Stop pré-codage étape 2).
// ==============================================================================

import {
  listClientsRefUseCase,
  listDevisesUseCase,
  listLanguesUseCase,
  listPaysUseCase,
  listRegionsUseCase,
  listTeamMembersUseCase,
  listTypesContactUseCase,
} from "@/server/composition-root";

import { SettingsTeamTabs } from "../_components/SettingsTeamTabs";

const CLIENTS_REF_FETCH_LIMIT = 500;

export default async function SettingsTeamPage() {
  const [regions, pays, devises, langues, typesContact, teamMembers, clientsRef] =
    await Promise.all([
      listRegionsUseCase.execute(),
      listPaysUseCase.execute(),
      listDevisesUseCase.execute(),
      listLanguesUseCase.execute(),
      listTypesContactUseCase.execute(),
      listTeamMembersUseCase.execute(),
      // Phase 24 — référentiel clients (lecture seule). Limite haute pour
      // charger tout le set en une fois (la pagination est faite client-side
      // dans l'onglet — volumétrie attendue ≤ 200 entrées).
      listClientsRefUseCase.execute({ limit: CLIENTS_REF_FETCH_LIMIT }),
    ]);

  return (
    <SettingsTeamTabs
      regions={regions}
      pays={pays}
      devises={devises}
      langues={langues}
      typesContact={typesContact}
      teamMembers={teamMembers}
      clientsRef={clientsRef.items}
    />
  );
}
