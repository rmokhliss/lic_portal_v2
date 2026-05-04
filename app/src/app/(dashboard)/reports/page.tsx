// ==============================================================================
// LIC v2 — /reports (Phase 11.B EC-09)
// 3 cartes export CSV ADMIN/SADMIN.
// ==============================================================================

import { notFound } from "next/navigation";

import { requireAuthPage } from "@/server/infrastructure/auth";
import { listClientsUseCase } from "@/server/composition-root";

import { ReportsPanel, type ClientOption } from "./_components/ReportsPanel";

export default async function ReportsPage() {
  const user = await requireAuthPage();
  if (user.role !== "ADMIN" && user.role !== "SADMIN") notFound();

  const clientsPage = await listClientsUseCase.execute({ limit: 200 });
  const clients: ClientOption[] = clientsPage.items.map((c) => ({
    id: c.id,
    label: `${c.codeClient} — ${c.raisonSociale}`,
  }));

  return (
    <div className="p-8">
      <ReportsPanel clients={clients} />
    </div>
  );
}
