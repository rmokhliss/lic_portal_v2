// LIC v2 — /licences/[id] (racine) : redirect vers /resume (Phase 5.F)

import { redirect } from "next/navigation";

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
}

export default async function LicenceDetailRoot({ params }: PageProps): Promise<never> {
  const { id } = await params;
  redirect(`/licences/${id}/resume`);
}
