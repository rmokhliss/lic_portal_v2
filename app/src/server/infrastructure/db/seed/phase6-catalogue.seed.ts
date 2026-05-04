// ==============================================================================
// LIC v2 — Seed démo Phase 6 — catalogue produits/articles + liaisons + history
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé après seedPhase5Licences. Crée :
//   - 5 produits SELECT-PX (catalogue commercial)
//   - 15 articles (3 par produit en moyenne)
//   - Liaisons : ~20 licences attachées avec 1 produit + 2-3 articles chacune
//   - 60 snapshots volume_history (~3 mois × 20 licences)
//
// Pattern hexagonal — passe par REPOSITORIES + audit mode='SEED' pour les
// liaisons (entité métier). Les produits/articles sont insérés sans audit
// (référentiels paramétrables R-27).
// Idempotent : early return si lic_produits_ref déjà peuplée.
// ==============================================================================

import { drizzle } from "drizzle-orm/postgres-js";
import type postgres from "postgres";

import { SYSTEM_USER_DISPLAY, SYSTEM_USER_ID } from "@s2m-lic/shared/constants/system-user";

import * as schema from "@/server/infrastructure/db/schema";
import { createChildLogger } from "@/server/infrastructure/logger";
import { ArticleRepositoryPg } from "@/server/modules/article/adapters/postgres/article.repository.pg";
import { Article } from "@/server/modules/article/domain/article.entity";
import { AuditRepositoryPg } from "@/server/modules/audit/adapters/postgres/audit.repository.pg";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import { LicenceArticleRepositoryPg } from "@/server/modules/licence-article/adapters/postgres/licence-article.repository.pg";
import { LicenceArticle } from "@/server/modules/licence-article/domain/licence-article.entity";
import { LicenceProduitRepositoryPg } from "@/server/modules/licence-produit/adapters/postgres/licence-produit.repository.pg";
import { LicenceProduit } from "@/server/modules/licence-produit/domain/licence-produit.entity";
import { ProduitRepositoryPg } from "@/server/modules/produit/adapters/postgres/produit.repository.pg";
import { Produit } from "@/server/modules/produit/domain/produit.entity";
import { VolumeHistoryRepositoryPg } from "@/server/modules/volume-history/adapters/postgres/volume-history.repository.pg";
import { ArticleVolumeSnapshot } from "@/server/modules/volume-history/domain/article-volume-snapshot.entity";

const log = createChildLogger("db/seed/phase6-catalogue");

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

interface Repos {
  readonly db: SeedDb;
  readonly auditRepo: AuditRepositoryPg;
  readonly produitRepo: ProduitRepositoryPg;
  readonly articleRepo: ArticleRepositoryPg;
  readonly licProduitRepo: LicenceProduitRepositoryPg;
  readonly licArticleRepo: LicenceArticleRepositoryPg;
  readonly volumeHistoryRepo: VolumeHistoryRepositoryPg;
}

interface ProduitSeed {
  readonly code: string;
  readonly nom: string;
  readonly description: string;
  readonly articles: readonly { code: string; nom: string; uniteVolume: string }[];
}

const PRODUIT_SEEDS: readonly ProduitSeed[] = [
  {
    code: "SPX-CORE",
    nom: "SELECT-PX Core",
    description: "Module central de la suite SELECT-PX (autorisation transactions)",
    articles: [
      { code: "USERS", nom: "Utilisateurs simultanés", uniteVolume: "utilisateurs" },
      { code: "TX-MOIS", nom: "Transactions par mois", uniteVolume: "transactions" },
      { code: "API-CALLS", nom: "Appels API par jour", uniteVolume: "appels" },
    ],
  },
  {
    code: "SPX-REPORTING",
    nom: "SELECT-PX Reporting",
    description: "Génération de rapports et exports comptables",
    articles: [
      { code: "EXPORTS", nom: "Exports par mois", uniteVolume: "exports" },
      { code: "STORAGE", nom: "Stockage rapports", uniteVolume: "Mo" },
      { code: "DASHBOARDS", nom: "Tableaux de bord publiés", uniteVolume: "dashboards" },
    ],
  },
  {
    code: "SPX-API",
    nom: "SELECT-PX API Gateway",
    description: "Passerelle API pour intégration tierce",
    articles: [
      { code: "ENDPOINTS", nom: "Endpoints exposés", uniteVolume: "endpoints" },
      { code: "RATE-LIMIT", nom: "Plafond requêtes/seconde", uniteVolume: "req/s" },
      { code: "WEBHOOKS", nom: "Webhooks actifs", uniteVolume: "webhooks" },
    ],
  },
  {
    code: "SPX-MOBILE",
    nom: "SELECT-PX Mobile",
    description: "SDK et back-office mobile",
    articles: [
      { code: "DEVICES", nom: "Devices enregistrés", uniteVolume: "devices" },
      { code: "PUSH", nom: "Push notifications/mois", uniteVolume: "push" },
      { code: "SDK-KEYS", nom: "Clés SDK actives", uniteVolume: "clés" },
    ],
  },
  {
    code: "SPX-FRAUD",
    nom: "SELECT-PX FraudShield",
    description: "Détection de fraude et scoring temps réel",
    articles: [
      { code: "RULES", nom: "Règles de scoring actives", uniteVolume: "règles" },
      { code: "SCORINGS", nom: "Scorings par jour", uniteVolume: "scorings" },
      { code: "ALERTS", nom: "Alertes générées", uniteVolume: "alertes" },
    ],
  },
];

async function alreadySeeded(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM lic_produits_ref`;
  return Number(rows[0]?.count ?? "0") > 0;
}

async function seedProduitsAndArticles(
  repos: Repos,
): Promise<readonly { produitId: number; articleIds: readonly number[] }[]> {
  log.info("Seeding produits + articles (catalogue SELECT-PX)");
  const out: { produitId: number; articleIds: number[] }[] = [];

  for (const p of PRODUIT_SEEDS) {
    const produit = Produit.create({ code: p.code, nom: p.nom, description: p.description });
    const persisted = await repos.produitRepo.save(produit);
    const articleIds: number[] = [];
    for (const a of p.articles) {
      const article = Article.create({
        produitId: persisted.id,
        code: a.code,
        nom: a.nom,
        uniteVolume: a.uniteVolume,
      });
      const savedA = await repos.articleRepo.save(article);
      articleIds.push(savedA.id);
    }
    out.push({ produitId: persisted.id, articleIds });
  }

  log.info({ produits: out.length, articles: out.reduce((s, o) => s + o.articleIds.length, 0) });
  return out;
}

async function loadFirstNLicenceIds(sql: postgres.Sql, n: number): Promise<readonly string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM lic_licences ORDER BY reference ASC LIMIT ${n}
  `;
  return rows.map((r) => r.id);
}

async function auditAdd(
  repos: Repos,
  tx: unknown,
  entity: "licence-produit" | "licence-article",
  entityId: string,
  snapshot: Record<string, unknown>,
): Promise<void> {
  const action = entity === "licence-produit" ? "LICENCE_PRODUIT_ADDED" : "LICENCE_ARTICLE_ADDED";
  const entry = AuditEntry.create({
    entity,
    entityId,
    action,
    afterData: snapshot,
    userId: SYSTEM_USER_ID,
    userDisplay: SYSTEM_USER_DISPLAY,
    mode: "SEED",
  });
  await repos.auditRepo.save(entry, tx);
}

async function seedLicenceLiaisons(
  repos: Repos,
  catalogue: readonly { produitId: number; articleIds: readonly number[] }[],
  licenceIds: readonly string[],
): Promise<readonly { licenceId: string; articleId: number; volumeAutorise: number }[]> {
  log.info({ licences: licenceIds.length }, "Seeding licence-produits + licence-articles");

  // Distribution : tour-à-tour les 5 produits sur les 20 licences (4 par produit).
  // Chaque licence reçoit 1 produit + ses 3 articles avec un volume autorisé varié.
  const articleAttachments: { licenceId: string; articleId: number; volumeAutorise: number }[] = [];

  for (let i = 0; i < licenceIds.length; i++) {
    const licenceId = licenceIds[i];
    if (licenceId === undefined) continue;
    const cat = catalogue[i % catalogue.length];
    if (cat === undefined) continue;

    await repos.db.transaction(async (tx) => {
      const liaison = LicenceProduit.create({ licenceId, produitId: cat.produitId });
      const savedLP = await repos.licProduitRepo.save(liaison, SYSTEM_USER_ID, tx);
      await auditAdd(repos, tx, "licence-produit", savedLP.id, savedLP.toAuditSnapshot());

      for (let aIdx = 0; aIdx < cat.articleIds.length; aIdx++) {
        const articleId = cat.articleIds[aIdx];
        if (articleId === undefined) continue;
        // Volumes variés : 1000/5000/10000 selon position de l'article.
        const volumeAutorise = (aIdx + 1) * 1000 * (1 + (i % 3));
        const volumeConsomme = Math.floor(volumeAutorise * (0.2 + ((i + aIdx) % 5) * 0.15));
        const la = LicenceArticle.create({
          licenceId,
          articleId,
          volumeAutorise,
          volumeConsomme,
        });
        const savedLA = await repos.licArticleRepo.save(la, SYSTEM_USER_ID, tx);
        await auditAdd(repos, tx, "licence-article", savedLA.id, savedLA.toAuditSnapshot());
        articleAttachments.push({ licenceId, articleId, volumeAutorise });
      }
    });
  }

  return articleAttachments;
}

async function seedVolumeSnapshots(
  repos: Repos,
  attachments: readonly { licenceId: string; articleId: number; volumeAutorise: number }[],
): Promise<void> {
  // 3 mois de snapshots × 20 licences × ~1 article principal = 60 snapshots.
  // Pour rester sous le seuil 60 demandé, on prend l'article `0` de chaque licence.
  log.info({ count: attachments.length }, "Seeding volume_history (3 derniers mois)");

  const seenLicences = new Set<string>();
  const targetAttachments = attachments.filter((a) => {
    if (seenLicences.has(a.licenceId)) return false;
    seenLicences.add(a.licenceId);
    return true;
  });

  const today = new Date();
  const periodes: Date[] = [];
  for (let m = 3; m >= 1; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m + 1, 1);
    periodes.push(d);
  }

  for (const attach of targetAttachments) {
    for (let p = 0; p < periodes.length; p++) {
      const periode = periodes[p];
      if (periode === undefined) continue;
      const ratio = 0.3 + p * 0.25; // 30% → 80% progressif
      const snapshot = ArticleVolumeSnapshot.create({
        licenceId: attach.licenceId,
        articleId: attach.articleId,
        periode,
        volumeAutorise: attach.volumeAutorise,
        volumeConsomme: Math.floor(attach.volumeAutorise * ratio),
      });
      await repos.volumeHistoryRepo.save(snapshot);
    }
  }
}

export async function seedPhase6Catalogue(sql: postgres.Sql): Promise<void> {
  log.info("Phase 6.E — seed démo catalogue + liaisons + volume history");

  if (await alreadySeeded(sql)) {
    log.info("lic_produits_ref déjà peuplée — seed Phase 6 skip (idempotent)");
    return;
  }

  const seedDb = drizzle(sql, { schema });
  const repos: Repos = {
    db: seedDb,
    auditRepo: new AuditRepositoryPg(seedDb),
    produitRepo: new ProduitRepositoryPg(seedDb),
    articleRepo: new ArticleRepositoryPg(seedDb),
    licProduitRepo: new LicenceProduitRepositoryPg(seedDb),
    licArticleRepo: new LicenceArticleRepositoryPg(seedDb),
    volumeHistoryRepo: new VolumeHistoryRepositoryPg(seedDb),
  };

  const catalogue = await seedProduitsAndArticles(repos);
  const licenceIds = await loadFirstNLicenceIds(sql, 20);
  if (licenceIds.length === 0) {
    log.warn("Aucune licence seedée Phase 5 — Phase 6 liaisons skip");
    return;
  }
  const attachments = await seedLicenceLiaisons(repos, catalogue, licenceIds);
  await seedVolumeSnapshots(repos, attachments);

  log.info({ licences: licenceIds.length }, "Phase 6.E seed completed");
}
