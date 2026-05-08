// ==============================================================================
// LIC v2 — /renewals (Phase 9.B, EC-11)
// Renouvellements cross-clients. ADMIN/SADMIN.
// ==============================================================================

import { notFound } from "next/navigation";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { listClientsUseCase, searchRenouvellementsUseCase } from "@/server/composition-root";

import { RenewalsList, type ClientOption } from "./_components/RenewalsList";

export default async function RenewalsPage() {
  const user = await requireAuthPage();
  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  // 1er chargement : EN_COURS uniquement (vue par défaut renouvellements à
  // traiter — pattern EC-11). L'utilisateur peut élargir via le filtre.
  const initialPage = await searchRenouvellementsUseCase.execute({
    status: "EN_COURS",
    limit: 50,
  });

  // Liste clients pour le filtre dropdown — on récupère 200 max ; au-delà,
  // l'utilisateur tape l'UUID directement (pattern dégradé acceptable
  // pour cette phase, à raffiner avec un combobox autocomplete F-13+).
  const clientsPage = await listClientsUseCase.execute({ limit: 200 });
  const clients: ClientOption[] = clientsPage.items.map((c) => ({
    id: c.id,
    label: `${c.codeClient} — ${c.raisonSociale}`,
  }));

  return (
    <div className="p-8">
      <RenewalsList
        initialItems={initialPage.items}
        initialCursor={initialPage.nextCursor}
        clients={clients}
      />
    </div>
  );
}
