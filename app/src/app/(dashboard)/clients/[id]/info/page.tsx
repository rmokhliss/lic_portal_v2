// ==============================================================================
// LIC v2 — /clients/[id]/info (Phase 4 étape 4.F)
// Server Component : fetch client + role check + render ClientInfoTab Client.
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  listDevisesUseCase,
  listLanguesUseCase,
  listPaysUseCase,
  listTeamMembersUseCase,
} from "@/server/composition-root";

import { ClientInfoTab } from "../_components/ClientInfoTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientInfoPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  let client;
  try {
    // Phase 16 — DETTE-LIC-022 : passe actor.id pour émettre audit CLIENT_READ
    // best-effort (les autres callers — layouts, listings — restent sans
    // actorId pour ne pas spammer l'audit log).
    client = await getClientUseCase.execute(id, user.id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  // T-01 — référentiels SADMIN pour <select> ClientDialog (codes actifs only).
  const [paysAll, devisesAll, languesAll, salesAll, amAll] = await Promise.all([
    listPaysUseCase.execute({}),
    listDevisesUseCase.execute({}),
    listLanguesUseCase.execute({}),
    listTeamMembersUseCase.execute({ actif: true, roleTeam: "SALES" }),
    listTeamMembersUseCase.execute({ actif: true, roleTeam: "AM" }),
  ]);
  const paysList = paysAll.filter((p) => p.actif).map((p) => ({ code: p.codePays, label: p.nom }));
  const devisesList = devisesAll
    .filter((d) => d.actif)
    .map((d) => ({ code: d.codeDevise, label: d.nom }));
  const languesList = languesAll
    .filter((l) => l.actif)
    .map((l) => ({ code: l.codeLangue, label: l.nom }));
  const formatTeamMember = (m: { prenom: string | null; nom: string }): string =>
    m.prenom !== null && m.prenom !== "" ? `${m.prenom} ${m.nom}` : m.nom;
  const salesList = salesAll.map((m) => ({
    code: formatTeamMember(m),
    label: formatTeamMember(m),
  }));
  const amList = amAll.map((m) => ({ code: formatTeamMember(m), label: formatTeamMember(m) }));

  return (
    <ClientInfoTab
      client={client}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
      paysList={paysList}
      devisesList={devisesList}
      languesList={languesList}
      salesList={salesList}
      amList={amList}
    />
  );
}
