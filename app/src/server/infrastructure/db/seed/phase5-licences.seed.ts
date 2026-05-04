// ==============================================================================
// LIC v2 — Seed démo Phase 5 — 55 licences + 10 renouvellements
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé par `pnpm db:seed` après seedPhase4Clients. Crée :
//   - 1 licence par client seedé Phase 4.D (55 total)
//     • Format LIC-{YYYY}-001..055 (allocateNextReference, R-34)
//     • Statut majoritaire ACTIF, 5 SUSPENDU, 5 EXPIRE pour démo statuts
//     • Date début = ~année courante - 1, fin = ~année courante + 2
//   - 10 renouvellements sur 10 clients pilotes (mix EN_COURS/VALIDE/ANNULE)
//
// Pattern hexagonal strict — passe par les REPOSITORIES + audit mode='SEED'.
// Idempotent : early return si lic_licences déjà peuplée.
// ==============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import type postgres from "postgres";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import { createChildLogger } from "@/server/infrastructure/logger";
import * as schema from "@/server/infrastructure/db/schema";
import { AuditRepositoryPg } from "@/server/modules/audit/adapters/postgres/audit.repository.pg";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import { LicenceRepositoryPg } from "@/server/modules/licence/adapters/postgres/licence.repository.pg";
import { Licence, type LicenceStatus } from "@/server/modules/licence/domain/licence.entity";
import { RenouvellementRepositoryPg } from "@/server/modules/renouvellement/adapters/postgres/renouvellement.repository.pg";
import { Renouvellement } from "@/server/modules/renouvellement/domain/renouvellement.entity";

const log = createChildLogger("db/seed/phase5-licences");

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

interface Repos {
  readonly db: SeedDb;
  readonly auditRepo: AuditRepositoryPg;
  readonly licenceRepo: LicenceRepositoryPg;
  readonly renouvRepo: RenouvellementRepositoryPg;
}

/** Statuts variés pour démo : 45 ACTIF + 5 SUSPENDU + 5 EXPIRE. Le 1er
 *  client (BAM) reste ACTIF systématiquement. */
function statutForIndex(idx: number): LicenceStatus {
  if (idx >= 45 && idx < 50) return "SUSPENDU";
  if (idx >= 50) return "EXPIRE";
  return "ACTIF";
}

async function alreadySeeded(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_licences`;
  return Number(rows[0]?.count ?? "0") > 0;
}

interface ClientWithSiege {
  readonly clientId: string;
  readonly entiteId: string;
  readonly raisonSociale: string;
  readonly codeClient: string;
}

/** Charge en bloc les 55 clients seedés Phase 4 + leur Siège (1re entité par
 *  client, ordre date_creation ASC). */
async function loadClientsAndSieges(sql: postgres.Sql): Promise<readonly ClientWithSiege[]> {
  return sql<ClientWithSiege[]>`
    SELECT DISTINCT ON (c.id)
      c.id AS "clientId",
      c.code_client AS "codeClient",
      c.raison_sociale AS "raisonSociale",
      e.id AS "entiteId"
    FROM lic_clients c
    JOIN lic_entites e ON e.client_id = c.id AND e.nom LIKE 'Siège %'
    ORDER BY c.id, e.created_at ASC
  `;
}

async function auditCreate(
  repos: Repos,
  tx: unknown,
  entity: "licence" | "renouvellement",
  entityId: string,
  snapshot: Record<string, unknown>,
): Promise<void> {
  const entry = AuditEntry.create({
    entity,
    entityId,
    action: `${entity.toUpperCase()}_CREATED`,
    afterData: snapshot,
    userId: SYSTEM_USER_ID,
    userDisplay: SYSTEM_USER_DISPLAY,
    mode: "SEED",
  });
  await repos.auditRepo.save(entry, tx);
}

async function seedLicences(
  repos: Repos,
  clients: readonly ClientWithSiege[],
): Promise<readonly { licenceId: string; codeClient: string }[]> {
  log.info({ count: clients.length }, "Seeding licences via licenceRepository");

  const year = new Date().getFullYear();
  const dateDebut = new Date(`${String(year - 1)}-01-01T00:00:00Z`);
  const dateFin = new Date(`${String(year + 2)}-12-31T00:00:00Z`);

  const out: { licenceId: string; codeClient: string }[] = [];

  for (let i = 0; i < clients.length; i++) {
    const c = clients[i];
    if (c === undefined) continue;
    const status = statutForIndex(i);
    await repos.db.transaction(async (tx) => {
      const reference = await repos.licenceRepo.allocateNextReference(tx);
      const candidate = Licence.create({
        reference,
        clientId: c.clientId,
        entiteId: c.entiteId,
        dateDebut,
        dateFin,
        status,
      });
      const saved = await repos.licenceRepo.save(candidate, SYSTEM_USER_ID, tx);
      await auditCreate(repos, tx, "licence", saved.id, saved.toAuditSnapshot());
      out.push({ licenceId: saved.id, codeClient: c.codeClient });
    });
  }

  return out;
}

interface RenouvSeed {
  readonly codeClient: string;
  readonly status: "EN_COURS" | "VALIDE" | "ANNULE";
  readonly motif?: string;
}

const RENOUV_SEEDS: readonly RenouvSeed[] = [
  { codeClient: "CDM", status: "EN_COURS" },
  { codeClient: "CASHPLUS", status: "EN_COURS" },
  { codeClient: "BIAT", status: "EN_COURS" },
  { codeClient: "ATTIJARI_TN", status: "EN_COURS" },
  { codeClient: "BNI_CI", status: "EN_COURS" },
  { codeClient: "CMI", status: "VALIDE" },
  { codeClient: "BMCI", status: "VALIDE" },
  { codeClient: "NSIA", status: "VALIDE" },
  { codeClient: "RAWBANK", status: "ANNULE", motif: "Pas de budget client" },
  { codeClient: "MEPS", status: "ANNULE", motif: "Client en faillite" },
];

async function seedRenouvellements(
  repos: Repos,
  licences: readonly { licenceId: string; codeClient: string }[],
): Promise<void> {
  log.info({ count: RENOUV_SEEDS.length }, "Seeding renouvellements démo");

  const codeToLicence = new Map<string, string>();
  for (const l of licences) {
    codeToLicence.set(l.codeClient, l.licenceId);
  }

  const year = new Date().getFullYear();
  const newDebut = new Date(`${String(year + 2)}-01-01T00:00:00Z`);
  const newFin = new Date(`${String(year + 4)}-12-31T00:00:00Z`);

  for (const seed of RENOUV_SEEDS) {
    const licenceId = codeToLicence.get(seed.codeClient);
    if (licenceId === undefined) {
      log.warn({ codeClient: seed.codeClient }, "Licence introuvable pour renouv seed, skip");
      continue;
    }

    await repos.db.transaction(async (tx) => {
      const baseCommentaire =
        seed.status === "ANNULE" && seed.motif !== undefined
          ? `Demande renouvellement | Annulé : ${seed.motif}`
          : "Demande renouvellement";

      // Crée toujours en EN_COURS, puis update vers le statut cible.
      const candidate = Renouvellement.create({
        licenceId,
        nouvelleDateDebut: newDebut,
        nouvelleDateFin: newFin,
        commentaire: baseCommentaire,
      });
      const saved = await repos.renouvRepo.save(candidate, SYSTEM_USER_ID, tx);
      await auditCreate(repos, tx, "renouvellement", saved.id, saved.toAuditSnapshot());

      if (seed.status !== "EN_COURS") {
        const transitioned =
          seed.status === "VALIDE"
            ? saved.withStatus("VALIDE", SYSTEM_USER_ID)
            : saved.withStatus("ANNULE", null);
        await repos.renouvRepo.update(transitioned, tx);
      }
    });
  }
}

export async function seedPhase5Licences(sql: postgres.Sql): Promise<void> {
  log.info("Phase 5.D — seed démo licences/renouvellements");

  if (await alreadySeeded(sql)) {
    log.info("lic_licences déjà peuplée — seed Phase 5 skip (idempotent)");
    return;
  }

  const seedDb = drizzle(sql, { schema });
  const repos: Repos = {
    db: seedDb,
    auditRepo: new AuditRepositoryPg(seedDb),
    licenceRepo: new LicenceRepositoryPg(seedDb),
    renouvRepo: new RenouvellementRepositoryPg(seedDb),
  };

  const clients = await loadClientsAndSieges(sql);
  if (clients.length === 0) {
    log.warn("Aucun client seedé Phase 4 — seed Phase 5 skip (dépendance manquante)");
    return;
  }

  const licences = await seedLicences(repos, clients);
  await seedRenouvellements(repos, licences);

  log.info({ licencesCount: licences.length }, "Phase 5.D seed completed");
}
