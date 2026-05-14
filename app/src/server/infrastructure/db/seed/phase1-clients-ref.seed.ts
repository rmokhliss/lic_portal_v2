// ==============================================================================
// LIC v2 — Phase 24 — Seed bootstrap référentiel `lic_clients_ref`
//
// Alimente la table `lic_clients_ref` avec les codes commerciaux S2M réels
// (codeClient + raisonSociale uniquement). Sert à l'autocomplétion à la
// création client (/clients/new) — la saisie libre reste autorisée.
//
// Liste canonique extraite de phase4-clients.seed.ts (CLIENT_SEEDS) avec
// les corrections Phase 24 :
//   - AWASH retiré (sorti du portefeuille S2M)
//   - BICICI dédupliqué (BICICISN + BICICICI fusionnés en BICICI, les
//     filiales Sénégal/Côte d'Ivoire restent côté démo comme entités)
//
// Pattern référentiel SADMIN, idempotent : `ON CONFLICT (code_client) DO
// NOTHING`. Préservé par purge-demo (pas dans PURGE_TABLES).
// ==============================================================================

import type postgres from "postgres";

import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed/phase1-clients-ref");

interface ClientRefSeed {
  readonly codeClient: string;
  readonly raisonSociale: string;
}

/** 53 clients commerciaux S2M réels (codes stables business). */
const CLIENT_REF_SEEDS: readonly ClientRefSeed[] = [
  { codeClient: "CDM", raisonSociale: "Crédit du Maroc" },
  { codeClient: "CASHPLUS", raisonSociale: "CashPlus" },
  { codeClient: "DASHY", raisonSociale: "Dashy" },
  { codeClient: "LAPOSTE_MA", raisonSociale: "La Poste Maroc" },
  { codeClient: "CMI", raisonSociale: "Centre Monétique Interbancaire" },
  { codeClient: "TRESORERIE", raisonSociale: "Trésorerie Générale" },
  { codeClient: "BMCI", raisonSociale: "BMCI" },
  { codeClient: "ATTIJARI_TN", raisonSociale: "Attijari Bank Tunisie" },
  { codeClient: "SKYTELECOM", raisonSociale: "SkyTelecom" },
  { codeClient: "LAPOSTE_TN", raisonSociale: "La Poste Tunisie" },
  { codeClient: "BIAT", raisonSociale: "BIAT" },
  { codeClient: "TADAWUL", raisonSociale: "Tadawul" },
  { codeClient: "MASARAT", raisonSociale: "Masarat" },
  { codeClient: "ALYAKIN", raisonSociale: "Alyakin" },
  { codeClient: "ABCI", raisonSociale: "ABCI" },
  { codeClient: "ALBARAKA", raisonSociale: "AlBaraka" },
  { codeClient: "BNP_DZ", raisonSociale: "BNP Paribas Algérie" },
  { codeClient: "SGA_DZ", raisonSociale: "Société Générale Algérie" },
  { codeClient: "CHINGUITTY", raisonSociale: "Banque Chinguitty" },
  { codeClient: "GIMTEL", raisonSociale: "GimTel" },
  { codeClient: "BAMIS", raisonSociale: "BAMIS" },
  { codeClient: "BMCIM", raisonSociale: "BMCI Mauritanie" },
  { codeClient: "BEA", raisonSociale: "BEA" },
  { codeClient: "BPM", raisonSociale: "BPM" },
  { codeClient: "GBM", raisonSociale: "GBM" },
  { codeClient: "NBM", raisonSociale: "NBM" },
  // BICICI fusionné — 1 seul client, filiales Sénégal/Côte d'Ivoire = entités démo.
  { codeClient: "BICICI", raisonSociale: "BICICI" },
  { codeClient: "BNI_CI", raisonSociale: "BNI Côte d'Ivoire" },
  { codeClient: "NSIA", raisonSociale: "NSIA" },
  { codeClient: "GIE", raisonSociale: "GIE Cameroun" },
  { codeClient: "AFB", raisonSociale: "AFB" },
  { codeClient: "BTCI", raisonSociale: "BTCI" },
  { codeClient: "SONIBANK", raisonSociale: "SONIBANK" },
  { codeClient: "RAWBANK", raisonSociale: "Rawbank" },
  { codeClient: "BAO", raisonSociale: "BAO" },
  { codeClient: "BCAB", raisonSociale: "BCAB" },
  { codeClient: "ABAY", raisonSociale: "Abay Bank" },
  { codeClient: "PSS", raisonSociale: "PSS" },
  // AWASH retiré — sorti du portefeuille S2M (Phase 24).
  { codeClient: "SLCB", raisonSociale: "SLCB" },
  { codeClient: "HBL", raisonSociale: "HBL" },
  { codeClient: "NIC", raisonSociale: "NIC" },
  { codeClient: "NI", raisonSociale: "National Bank Jordanie" },
  { codeClient: "CAB", raisonSociale: "CAB" },
  { codeClient: "CAB_PL", raisonSociale: "CAB Private Label" },
  { codeClient: "MEPS", raisonSociale: "Meps" },
  { codeClient: "CIHAN", raisonSociale: "Cihan Bank" },
  { codeClient: "EGATE", raisonSociale: "eGate" },
  { codeClient: "JIB", raisonSociale: "JIB" },
  { codeClient: "IBY", raisonSociale: "IBY" },
  { codeClient: "POSTE_YE", raisonSociale: "Poste Yémen" },
  { codeClient: "FH", raisonSociale: "FH Dubai" },
  { codeClient: "NBL", raisonSociale: "NBL France" },
  { codeClient: "HUMM", raisonSociale: "Hummgroup" },
];

export async function seedPhase1ClientsRef(sql: postgres.Sql): Promise<void> {
  log.info({ count: CLIENT_REF_SEEDS.length }, "Phase 24 — seed bootstrap lic_clients_ref");

  for (const s of CLIENT_REF_SEEDS) {
    await sql`
      INSERT INTO lic_clients_ref (code_client, raison_sociale, actif)
      VALUES (${s.codeClient}, ${s.raisonSociale}, true)
      ON CONFLICT (code_client) DO NOTHING
    `;
  }

  log.info("Phase 24 bootstrap lic_clients_ref completed");
}
