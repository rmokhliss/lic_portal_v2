// ==============================================================================
// LIC v2 — /clients/[id]/info (Phase 4 étape 4.F)
// Server Component : fetch client + role check + render ClientInfoTab Client.
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import { getClientUseCase } from "@/server/composition-root";

import { ClientInfoTab } from "../_components/ClientInfoTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientInfoPage({ params }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;

  let client;
  try {
    client = await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  return (
    <ClientInfoTab client={client} canEdit={user.role === "ADMIN" || user.role === "SADMIN"} />
  );
}
