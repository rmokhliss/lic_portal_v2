// ==============================================================================
// LIC v2 — /clients/[id]/contacts (Phase 4 étape 4.F)
//
// Server Component : fetch entités du client + contacts de l'entité
// sélectionnée (param `entiteId` ou première entité par défaut).
// ==============================================================================

import { notFound } from "next/navigation";

import { isAppError } from "@/server/modules/error";
import { requireAuthPage } from "@/server/infrastructure/auth";
import {
  getClientUseCase,
  listContactsByEntiteUseCase,
  listEntitesByClientUseCase,
} from "@/server/composition-root";

import { ContactsTab } from "../_components/ContactsTab";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly entiteId?: string }>;
}

export default async function ClientContactsPage({ params, searchParams }: PageProps) {
  const user = await requireAuthPage();
  const { id } = await params;
  const { entiteId: entiteParam } = await searchParams;

  try {
    await getClientUseCase.execute(id);
  } catch (err) {
    if (isAppError(err) && err.code === "SPX-LIC-724") notFound();
    throw err;
  }

  const entites = await listEntitesByClientUseCase.execute(id);

  // Sélection : param URL si valide, sinon 1re entité, sinon null (UI affiche
  // « Aucune entité » et désactive la création de contact).
  const selectedEntiteId =
    entiteParam !== undefined && entites.some((e) => e.id === entiteParam)
      ? entiteParam
      : (entites[0]?.id ?? null);

  const contacts =
    selectedEntiteId === null ? [] : await listContactsByEntiteUseCase.execute(selectedEntiteId);

  return (
    <ContactsTab
      clientId={id}
      entites={entites}
      selectedEntiteId={selectedEntiteId}
      contacts={contacts}
      canEdit={user.role === "ADMIN" || user.role === "SADMIN"}
    />
  );
}
