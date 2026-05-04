// ==============================================================================
// LIC v2 — Endpoint /.well-known/s2m-ca.pem (Phase 3.G — ADR 0002)
//
// GET endpoint anonyme distribuant le certificat CA public S2M en PEM.
// Toggle SADMIN via setting `expose_s2m_ca_public` :
//   - false (default) → 404 silencieux (ne révèle pas l'existence)
//   - true             → 200 + PEM + Content-Type + Cache-Control 1h
//
// Pas d'audit (lecture publique anonyme). Pas d'auth (clé publique = publique
// par construction). Toggle d'opt-in posé par SADMIN dans /settings/security.
// ==============================================================================

import { NextResponse } from "next/server";

import { getCACertificateUseCase } from "@/server/composition-root";
import { settingRepository } from "@/server/modules/settings/settings.module";

export const dynamic = "force-dynamic";

const TOGGLE_KEY = "expose_s2m_ca_public";

export async function GET(): Promise<NextResponse> {
  // Toggle check — anonymous, sans révéler le détail si désactivé.
  const settings = await settingRepository.findAll();
  const toggle = settings.find((s) => s.key === TOGGLE_KEY);
  if (toggle?.value !== true) {
    return new NextResponse(null, { status: 404 });
  }

  let pem: string;
  try {
    pem = await getCACertificateUseCase.execute();
  } catch {
    // CA non générée alors que le toggle est ON — état incohérent côté admin,
    // on renvoie 404 silencieux côté client (ne révèle pas la situation).
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(pem, {
    status: 200,
    headers: {
      "Content-Type": "application/x-pem-file",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
