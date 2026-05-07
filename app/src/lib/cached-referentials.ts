// ==============================================================================
// LIC v2 — Cache referentiels lectures (Phase 22 R-44)
//
// Wrapper `unstable_cache` (TTL 60s) sur les listes référentielles fréquemment
// affichées dans les dropdowns (pages clients, licences, renewals, settings) :
// pays, régions, devises, langues, team-members (par rôle).
//
// Invalidation : chaque mutation via les Server Actions de
// `settings/_actions.ts` appelle `revalidateTag("referentials:<scope>")` après
// le `revalidatePath` existant. Le cache est ainsi flush dans la même
// transaction de revalidation, sans risque de divergence > 60s.
//
// Sécurité : ces caches contiennent des référentiels publics côté
// applicatif (pays, devises, etc.). Aucune donnée tenant-spécifique. Les
// `team-members` exposent prénom/nom/email — données semi-publiques côté
// back-office. Si le périmètre devait s'étendre à des PII, isoler par
// session via la clé `unstable_cache`.
// ==============================================================================

import { unstable_cache } from "next/cache";

import {
  listDevisesUseCase,
  listLanguesUseCase,
  listPaysUseCase,
  listRegionsUseCase,
  listTeamMembersUseCase,
} from "@/server/composition-root";

const TTL_SECONDS = 60;

export const REFERENTIALS_TAG_ALL = "referentials:all";
export const REFERENTIALS_TAG_PAYS = "referentials:pays";
export const REFERENTIALS_TAG_REGIONS = "referentials:regions";
export const REFERENTIALS_TAG_DEVISES = "referentials:devises";
export const REFERENTIALS_TAG_LANGUES = "referentials:langues";
export const REFERENTIALS_TAG_TEAM_MEMBERS = "referentials:team-members";

export const getCachedPays = unstable_cache(
  async () => listPaysUseCase.execute({}),
  ["referentials", "pays"],
  { revalidate: TTL_SECONDS, tags: [REFERENTIALS_TAG_ALL, REFERENTIALS_TAG_PAYS] },
);

export const getCachedRegions = unstable_cache(
  async () => listRegionsUseCase.execute({}),
  ["referentials", "regions"],
  { revalidate: TTL_SECONDS, tags: [REFERENTIALS_TAG_ALL, REFERENTIALS_TAG_REGIONS] },
);

export const getCachedDevises = unstable_cache(
  async () => listDevisesUseCase.execute({}),
  ["referentials", "devises"],
  { revalidate: TTL_SECONDS, tags: [REFERENTIALS_TAG_ALL, REFERENTIALS_TAG_DEVISES] },
);

export const getCachedLangues = unstable_cache(
  async () => listLanguesUseCase.execute({}),
  ["referentials", "langues"],
  { revalidate: TTL_SECONDS, tags: [REFERENTIALS_TAG_ALL, REFERENTIALS_TAG_LANGUES] },
);

/** Variante par rôle — `unstable_cache` re-mémorise par clé (le rôle est
 *  inclus dans la clé) et tags partagés sur tous les rôles (mutation = flush
 *  toutes les variantes). */
export const getCachedTeamMembersByRole = unstable_cache(
  async (role: "SALES" | "AM" | "DM") =>
    listTeamMembersUseCase.execute({ actif: true, roleTeam: role }),
  ["referentials", "team-members", "by-role"],
  {
    revalidate: TTL_SECONDS,
    tags: [REFERENTIALS_TAG_ALL, REFERENTIALS_TAG_TEAM_MEMBERS],
  },
);
