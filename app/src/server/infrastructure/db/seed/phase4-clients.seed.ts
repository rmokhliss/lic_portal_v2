// ==============================================================================
// LIC v2 — Seed démo Phase 4.D — 55 clients SELECT-PX + entités + contacts
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé par `pnpm db:seed` après les référentiels (étape 5 Phase 2.B). Crée :
//   - 55 clients SELECT-PX réels (data-model v1, demo-data-v1.sql Lot A5)
//   - 1 entité « Siège » par client (invariant via saveWithSiegeEntite — 4.B)
//   - Quelques entités additionnelles + contacts variés pour démo
//
// Pattern hexagonal strict : passe par les REPOSITORIES (clientRepository,
// entiteRepository, contactRepository) — pas de SQL brut. Audit mode='SEED'
// (cf. migration 0005) pour distinguer les actions seed des actions réelles
// dans le journal.
//
// Idempotent : early return si lic_clients déjà peuplée.
//
// Préparation pays/devises : les 55 clients utilisent des codes ISO non
// couverts par le seed Phase 2.B (LY, SD, MR, NP, JO, IQ, YE, AE, FR, AU,
// LYD, SDG, MRU, NPR, JOD, IQD, YER, AED, AUD). On les insère ici en amont
// avec ON CONFLICT DO NOTHING (idempotent à 100%).
// ==============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import type postgres from "postgres";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createChildLogger } from "@/server/infrastructure/logger";
import * as schema from "@/server/infrastructure/db/schema";
import { AuditRepositoryPg } from "@/server/modules/audit/adapters/postgres/audit.repository.pg";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import { ClientRepositoryPg } from "@/server/modules/client/adapters/postgres/client.repository.pg";
import { Client } from "@/server/modules/client/domain/client.entity";
import { ContactRepositoryPg } from "@/server/modules/contact/adapters/postgres/contact.repository.pg";
import { Contact } from "@/server/modules/contact/domain/contact.entity";
import { EntiteRepositoryPg } from "@/server/modules/entite/adapters/postgres/entite.repository.pg";
import { Entite } from "@/server/modules/entite/domain/entite.entity";

const log = createChildLogger("db/seed/phase4-clients");

// Phase 17 D2 — `mapRegion` retiré : la région d'un client est dérivée de
// `lic_pays_ref.region_code` qui est désormais aligné v1 (7 régions) via
// `seedPays()` dans `seed.ts`. Le champ `v1Region` ci-dessous est conservé
// uniquement pour traçabilité origine demo-data-v1 — il n'a aucun effet
// runtime (jamais lu).

interface ClientSeed {
  readonly codeClient: string;
  readonly raisonSociale: string;
  readonly codePays: string;
  readonly v1Region: string;
  readonly codeLangue: string;
  readonly codeDevise: string;
  readonly salesResponsable: string;
  readonly accountManager: string;
}

// 55 clients alignés docs/reference/demo-data-v1.sql lignes 287+.
const CLIENT_SEEDS: readonly ClientSeed[] = [
  {
    codeClient: "CDM",
    raisonSociale: "Crédit du Maroc",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "CASHPLUS",
    raisonSociale: "CashPlus",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "DASHY",
    raisonSociale: "Dashy",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "LAPOSTE_MA",
    raisonSociale: "La Poste Maroc",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "CMI",
    raisonSociale: "Centre Monétique Interbancaire",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "TRESORERIE",
    raisonSociale: "Trésorerie Générale",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "BMCI",
    raisonSociale: "BMCI",
    codePays: "MA",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "MAD",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "ATTIJARI_TN",
    raisonSociale: "Attijari Bank Tunisie",
    codePays: "TN",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "TND",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "SKYTELECOM",
    raisonSociale: "SkyTelecom",
    codePays: "TN",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "TND",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "LAPOSTE_TN",
    raisonSociale: "La Poste Tunisie",
    codePays: "TN",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "TND",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "BIAT",
    raisonSociale: "BIAT",
    codePays: "TN",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "fr",
    codeDevise: "TND",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "TADAWUL",
    raisonSociale: "Tadawul",
    codePays: "LY",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "LYD",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "MASARAT",
    raisonSociale: "Masarat",
    codePays: "LY",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "LYD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "ALYAKIN",
    raisonSociale: "Alyakin",
    codePays: "LY",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "LYD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "ABCI",
    raisonSociale: "ABCI",
    codePays: "LY",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "LYD",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "ALBARAKA",
    raisonSociale: "AlBaraka",
    codePays: "SD",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "SDG",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "BNP_DZ",
    raisonSociale: "BNP Paribas Algérie",
    codePays: "DZ",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "DZD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "SGA_DZ",
    raisonSociale: "Société Générale Algérie",
    codePays: "DZ",
    v1Region: "NORD_AFRIQUE",
    codeLangue: "en",
    codeDevise: "DZD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "CHINGUITTY",
    raisonSociale: "Banque Chinguitty",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "GIMTEL",
    raisonSociale: "GimTel",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "BAMIS",
    raisonSociale: "BAMIS",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "BMCIM",
    raisonSociale: "BMCI Mauritanie",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "BEA",
    raisonSociale: "BEA",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "BPM",
    raisonSociale: "BPM",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "GBM",
    raisonSociale: "GBM",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "NBM",
    raisonSociale: "NBM",
    codePays: "MR",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "MRU",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "BICICISN",
    raisonSociale: "BICICI Sénégal",
    codePays: "SN",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "BNI_CI",
    raisonSociale: "BNI Côte d'Ivoire",
    codePays: "CI",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "NSIA",
    raisonSociale: "NSIA",
    codePays: "CI",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "BICICICI",
    raisonSociale: "BICICI Côte d'Ivoire",
    codePays: "CI",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "GIE",
    raisonSociale: "GIE Cameroun",
    codePays: "CM",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XAF",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "AFB",
    raisonSociale: "AFB",
    codePays: "CM",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XAF",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "BTCI",
    raisonSociale: "BTCI",
    codePays: "TG",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "SONIBANK",
    raisonSociale: "SONIBANK",
    codePays: "NE",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XOF",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "RAWBANK",
    raisonSociale: "Rawbank",
    codePays: "CG",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XAF",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "BAO",
    raisonSociale: "BAO",
    codePays: "GQ",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "XAF",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "BCAB",
    raisonSociale: "BCAB",
    codePays: "BI",
    v1Region: "AFRIQUE_FR",
    codeLangue: "fr",
    codeDevise: "USD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "ABAY",
    raisonSociale: "Abay Bank",
    codePays: "ET",
    v1Region: "AFRIQUE_EN",
    codeLangue: "en",
    codeDevise: "ETB",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "PSS",
    raisonSociale: "PSS",
    codePays: "ET",
    v1Region: "AFRIQUE_EN",
    codeLangue: "en",
    codeDevise: "ETB",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "AWASH",
    raisonSociale: "Awash Bank",
    codePays: "ET",
    v1Region: "AFRIQUE_EN",
    codeLangue: "en",
    codeDevise: "ETB",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "SLCB",
    raisonSociale: "SLCB",
    codePays: "NP",
    v1Region: "ASIE",
    codeLangue: "en",
    codeDevise: "NPR",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "HBL",
    raisonSociale: "HBL",
    codePays: "NP",
    v1Region: "ASIE",
    codeLangue: "en",
    codeDevise: "NPR",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "NIC",
    raisonSociale: "NIC",
    codePays: "NP",
    v1Region: "ASIE",
    codeLangue: "en",
    codeDevise: "NPR",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "NI",
    raisonSociale: "National Bank Jordanie",
    codePays: "JO",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "JOD",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "CAB",
    raisonSociale: "CAB",
    codePays: "JO",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "JOD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "CAB_PL",
    raisonSociale: "CAB Private Label",
    codePays: "JO",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "JOD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "MEPS",
    raisonSociale: "Meps",
    codePays: "JO",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "JOD",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "CIHAN",
    raisonSociale: "Cihan Bank",
    codePays: "IQ",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "IQD",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Omar HANDI",
  },
  {
    codeClient: "EGATE",
    raisonSociale: "eGate",
    codePays: "IQ",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "IQD",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Nourddine BENASSEF",
  },
  {
    codeClient: "JIB",
    raisonSociale: "JIB",
    codePays: "IQ",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "IQD",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Hakim HOUSSNI",
  },
  {
    codeClient: "IBY",
    raisonSociale: "IBY",
    codePays: "YE",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "YER",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Houssam ELISMAILI",
  },
  {
    codeClient: "POSTE_YE",
    raisonSociale: "Poste Yémen",
    codePays: "YE",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "YER",
    salesResponsable: "Issam CHAYBI",
    accountManager: "Mounir BOUDERBA",
  },
  {
    codeClient: "FH",
    raisonSociale: "FH Dubai",
    codePays: "AE",
    v1Region: "MOYEN_ORIENT",
    codeLangue: "en",
    codeDevise: "AED",
    salesResponsable: "Mounir BOUSNIN",
    accountManager: "Ghassan FAHMI",
  },
  {
    codeClient: "NBL",
    raisonSociale: "NBL France",
    codePays: "FR",
    v1Region: "EUROPE",
    codeLangue: "fr",
    codeDevise: "EUR",
    salesResponsable: "Youssef BERRADA",
    accountManager: "Jamal MOUJAHID",
  },
  {
    codeClient: "HUMM",
    raisonSociale: "Hummgroup",
    codePays: "AU",
    v1Region: "AUSTRALIE",
    codeLangue: "en",
    codeDevise: "AUD",
    salesResponsable: "Ahmed KHALIL",
    accountManager: "Omar HANDI",
  },
];

// Phase 17 D1 — `ensurePaysExtensions` retiré : les 22 pays v1 sont désormais
// insérés par `seedPays()` dans `seed.ts` (avec UPSERT region_code aligné v1).
// La fonction faisait double-emploi et insérait des region_codes obsolètes.

/** Compléments devises (codes ISO non couverts par seed.ts Phase 2.B). */
async function ensureDevisesExtensions(sql: postgres.Sql): Promise<void> {
  await sql`
    INSERT INTO lic_devises_ref (code_devise, nom, symbole) VALUES
      ('LYD', 'Dinar libyen',      'LD'),
      ('SDG', 'Livre soudanaise',  'SDG'),
      ('MRU', 'Ouguiya',           'UM'),
      ('NPR', 'Roupie népalaise',  'Rs'),
      ('JOD', 'Dinar jordanien',   'JD'),
      ('IQD', 'Dinar irakien',     'ID'),
      ('YER', 'Rial yéménite',     'YR'),
      ('AED', 'Dirham EAU',        'AED'),
      ('AUD', 'Dollar australien', 'A$')
    ON CONFLICT (code_devise) DO NOTHING
  `;
}

interface ExtraEntiteSeed {
  readonly codeClient: string;
  readonly nom: string;
  readonly codePays?: string;
}

/** Quelques entités additionnelles (filiales) pour 5 clients pilotes. */
const EXTRA_ENTITES: readonly ExtraEntiteSeed[] = [
  { codeClient: "CDM", nom: "Filiale Casablanca", codePays: "MA" },
  { codeClient: "CDM", nom: "Filiale Rabat", codePays: "MA" },
  { codeClient: "BIAT", nom: "Filiale Sfax", codePays: "TN" },
  { codeClient: "ATTIJARI_TN", nom: "Filiale Sousse", codePays: "TN" },
  { codeClient: "BNI_CI", nom: "Filiale Yamoussoukro", codePays: "CI" },
];

interface ContactSeed {
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom: string;
  readonly email: string | null;
  readonly telephone: string | null;
}

/** Modèle de 2 contacts par client (1 ACHAT, 1 TECHNIQUE) — démo lisible. */
function defaultContacts(codeClient: string): readonly ContactSeed[] {
  const slug = codeClient.toLowerCase().replace(/_/g, "-");
  return [
    {
      typeContactCode: "ACHAT",
      nom: "DUPONT",
      prenom: "Sophie",
      email: `achat@${slug}.demo`,
      telephone: "+212-5-22-00-00-01",
    },
    {
      typeContactCode: "TECHNIQUE",
      nom: "MARTIN",
      prenom: "Karim",
      email: `tech@${slug}.demo`,
      telephone: "+212-5-22-00-00-02",
    },
  ];
}

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

interface Repos {
  readonly db: SeedDb;
  readonly auditRepo: AuditRepositoryPg;
  readonly clientRepo: ClientRepositoryPg;
  readonly entiteRepo: EntiteRepositoryPg;
  readonly contactRepo: ContactRepositoryPg;
}

/** Audit dans la même tx que la mutation (règle L3, mode SEED). */
async function auditCreate(
  repos: Repos,
  tx: unknown,
  entity: "client" | "entite" | "contact",
  entityId: string,
  snapshot: Record<string, unknown>,
  clientDisplay?: string,
): Promise<void> {
  const entry = AuditEntry.create({
    entity,
    entityId,
    action: `${entity.toUpperCase()}_CREATED`,
    afterData: snapshot,
    userId: SYSTEM_USER_ID,
    userDisplay: SYSTEM_USER_DISPLAY,
    // clientId omis pour entite/contact (R-33).
    ...(entity === "client" && clientDisplay !== undefined
      ? { clientId: entityId, clientDisplay }
      : {}),
    mode: "SEED",
  });
  await repos.auditRepo.save(entry, tx);
}

/** Map(codeClient → clientId uuid) pour résoudre les FK des extras. */
async function seedClients(repos: Repos): Promise<Map<string, string>> {
  log.info("Seeding 55 clients via clientRepository.saveWithSiegeEntite");
  const codeToId = new Map<string, string>();

  for (const seed of CLIENT_SEEDS) {
    await repos.db.transaction(async (tx) => {
      const candidate = Client.create({
        codeClient: seed.codeClient,
        raisonSociale: seed.raisonSociale,
        codePays: seed.codePays,
        codeDevise: seed.codeDevise,
        codeLangue: seed.codeLangue,
        salesResponsable: seed.salesResponsable,
        accountManager: seed.accountManager,
        statutClient: "ACTIF",
      });

      const { client, siegeEntiteId } = await repos.clientRepo.saveWithSiegeEntite(
        candidate,
        { nom: `Siège ${seed.raisonSociale}`, codePays: seed.codePays },
        SYSTEM_USER_ID,
        tx,
      );
      codeToId.set(seed.codeClient, client.id);

      await auditCreate(
        repos,
        tx,
        "client",
        client.id,
        { ...client.toAuditSnapshot(), siegeEntiteId },
        `${client.codeClient} — ${client.raisonSociale}`,
      );
      // Phase 17 D2 — v1Region conservé pour traçabilité demo-data-v1
      // mais non utilisé. La région est déterminée via lic_pays_ref.region_code.
      void seed.v1Region;
    });
  }
  return codeToId;
}

async function seedExtraEntites(repos: Repos, codeToId: Map<string, string>): Promise<void> {
  log.info("Seeding extra entités (5 filiales pour 5 clients pilotes)");
  for (const seed of EXTRA_ENTITES) {
    const clientId = codeToId.get(seed.codeClient);
    if (clientId === undefined) {
      log.warn({ codeClient: seed.codeClient }, "Client introuvable, skip extra entité");
      continue;
    }
    await repos.db.transaction(async (tx) => {
      const entite = Entite.create({
        clientId,
        nom: seed.nom,
        codePays: seed.codePays,
      });
      const saved = await repos.entiteRepo.save(entite, SYSTEM_USER_ID, tx);
      await auditCreate(repos, tx, "entite", saved.id, saved.toAuditSnapshot());
    });
  }
}

async function seedContacts(
  repos: Repos,
  codeToId: Map<string, string>,
  sql: postgres.Sql,
): Promise<void> {
  log.info("Seeding 2 contacts par client (ACHAT + TECHNIQUE)");
  const sieges = await sql<{ id: string; client_id: string }[]>`
    SELECT id, client_id FROM lic_entites
    WHERE nom LIKE 'Siège %'
  `;
  const clientToSiege = new Map<string, string>();
  for (const s of sieges) {
    clientToSiege.set(s.client_id, s.id);
  }

  for (const [codeClient, clientId] of codeToId.entries()) {
    const siegeId = clientToSiege.get(clientId);
    if (siegeId === undefined) continue;

    for (const c of defaultContacts(codeClient)) {
      await repos.db.transaction(async (tx) => {
        const contact = Contact.create({
          entiteId: siegeId,
          typeContactCode: c.typeContactCode,
          nom: c.nom,
          prenom: c.prenom,
          email: c.email ?? undefined,
          telephone: c.telephone ?? undefined,
        });
        const saved = await repos.contactRepo.save(contact, SYSTEM_USER_ID, tx);
        await auditCreate(repos, tx, "contact", saved.id, saved.toAuditSnapshot());
      });
    }
  }
}

/** Vérifie si lic_clients est déjà peuplée (idempotence). */
async function alreadySeeded(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_clients`;
  const c = Number(rows[0]?.count ?? "0");
  return c > 0;
}

export async function seedPhase4Clients(sql: postgres.Sql): Promise<void> {
  log.info("Phase 4.D — seed démo clients/entités/contacts");

  if (await alreadySeeded(sql)) {
    log.info("lic_clients déjà peuplée — seed Phase 4 skip (idempotent)");
    return;
  }

  // Drizzle instance dédiée seed (évite l'import server-only du singleton db).
  // Les repos bypassent volontairement les use-cases (qui ouvrent
  // db.transaction() sur le singleton non importable hors Next.js).
  const seedDb = drizzle(sql, { schema });
  const repos: Repos = {
    db: seedDb,
    auditRepo: new AuditRepositoryPg(seedDb),
    clientRepo: new ClientRepositoryPg(seedDb),
    entiteRepo: new EntiteRepositoryPg(seedDb),
    contactRepo: new ContactRepositoryPg(seedDb),
  };

  // Phase 17 D1 — pays insérés par seedPays() (seed.ts) en amont. Devises
  // complémentaires (LYD, SDG, MRU, NPR, JOD, IQD, YER, AED, AUD) restent
  // ici tant que seed.ts seedDevises ne les couvre pas.
  await ensureDevisesExtensions(sql);

  // 1. Clients + Sièges via repository (atomicité par client)
  const codeToId = await seedClients(repos);

  // 2. Entités additionnelles
  await seedExtraEntites(repos, codeToId);

  // 3. Contacts par défaut
  await seedContacts(repos, codeToId, sql);

  log.info({ clientsCount: codeToId.size }, "Phase 4.D seed completed");
}
