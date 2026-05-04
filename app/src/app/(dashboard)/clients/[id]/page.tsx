// LIC v2 — /clients/[id] (racine) : redirige vers /info (Phase 4 étape 4.F)

import { redirect } from "next/navigation";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function ClientDetailRoot({ params }: PageProps): Promise<never> {
  const { id } = await params;
  redirect(`/clients/${id}/info`);
}
