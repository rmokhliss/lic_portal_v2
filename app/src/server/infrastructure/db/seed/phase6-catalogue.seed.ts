// ==============================================================================
// LIC v2 — Seed démo Phase 6 — catalogue produits/articles + liaisons + history
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Phase 17 D3/D4 — refonte catalogue v1 réelle. Crée :
//   - 10 produits S2M (catalogue commercial v1 Excel feuille Catalogue)
//   - 31 articles (1 à 9 par produit selon couverture fonctionnelle)
//   - Liaisons : 100% des licences (au lieu de 20) reçoivent 1 produit + 3
//     articles avec volumes autorisés/consommés réalistes
//   - 1 snapshot volume_history mensuel × 3 mois × 1 article/licence
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
  readonly articles: readonly {
    code: string;
    nom: string;
    uniteVolume: string;
    /** Phase 19 R-13 — défaut true (volume contrôlé). Marqué false pour les
     *  articles "fonctionnalités" (ex: ATM-ADV, POS-ADV) où l'unité de
     *  volume `"fonctionnalités"` ne correspond pas à un compteur métier. */
    controleVolume?: boolean;
  }[];
}

const PRODUIT_SEEDS: readonly ProduitSeed[] = [
  {
    code: "SPX-CORE",
    nom: "SelectPX Core",
    description: "Module central — Kernel, autorisation, HSM, API Gateway",
    articles: [
      { code: "KERNEL", nom: "Kernel Switch & Authorization", uniteVolume: "transactions/jour" },
      { code: "HSM", nom: "HSM Interface", uniteVolume: "ops/jour" },
      { code: "OPEN-API", nom: "Open API", uniteVolume: "appels/mois" },
      { code: "FRAUD", nom: "Online Fraud Module", uniteVolume: "alertes/mois" },
      { code: "REPORTING", nom: "Reporting & Dashboarding", uniteVolume: "rapports/mois" },
      { code: "SMS-GW", nom: "SMS Gateway", uniteVolume: "SMS/mois" },
      { code: "SMTP-GW", nom: "SMTP Gateway", uniteVolume: "emails/mois" },
      { code: "ALERTS", nom: "Alert System", uniteVolume: "alertes/jour" },
      { code: "ARCHIVING", nom: "Archiving", uniteVolume: "Go/mois" },
    ],
  },
  {
    code: "SPX-SWITCH",
    nom: "SelectPX Switching Suite",
    description: "Suite de switch inter-institutions",
    articles: [
      {
        code: "SWITCH-INST",
        nom: "Institution Management (Switching)",
        uniteVolume: "institutions",
      },
      {
        code: "SWITCH-ISO",
        nom: "Switch to Switch Interface (ISO/API)",
        uniteVolume: "connexions",
      },
    ],
  },
  {
    code: "SPX-ACQ",
    nom: "SelectPX Acquiring Suite",
    description: "Suite acquiring — ATM, POS, eCommerce",
    articles: [
      { code: "ATM-STD", nom: "ATM Management (standard)", uniteVolume: "ATM" },
      {
        code: "ATM-ADV",
        nom: "ATM Management (valeur ajoutée)",
        uniteVolume: "fonctionnalités",
        controleVolume: false,
      },
      { code: "POS-STD", nom: "POS Server (standard)", uniteVolume: "terminaux" },
      {
        code: "POS-ADV",
        nom: "POS Server (valeur ajoutée)",
        uniteVolume: "fonctionnalités",
        controleVolume: false,
      },
      { code: "ECOM", nom: "E-commerce Gateway", uniteVolume: "transactions/mois" },
    ],
  },
  {
    code: "SPX-ISS",
    nom: "SelectPX Issuing Suite",
    description: "Suite issuing — cartes débit/crédit/prépayé",
    articles: [
      { code: "ISS-DEBIT", nom: "Debit Card Management", uniteVolume: "cartes actives" },
      { code: "ISS-CREDIT", nom: "Credit Card Management", uniteVolume: "cartes actives" },
      { code: "ISS-PREPAID", nom: "Prepaid Card Management", uniteVolume: "cartes actives" },
      { code: "ISS-ISLAMIC", nom: "Islamic Card Management", uniteVolume: "cartes actives" },
    ],
  },
  {
    code: "SSV6-CORE",
    nom: "SelectSystem V6 Core",
    description: "Core SelectSystem V6",
    articles: [
      { code: "SSV6-KERNEL", nom: "SSV6 Kernel", uniteVolume: "transactions/jour" },
      {
        code: "SSV6-FRAUD",
        nom: "SSV6 Fraud Module",
        uniteVolume: "alertes/mois",
        controleVolume: false,
      },
    ],
  },
  {
    code: "SSV6-ACQ",
    nom: "SelectSystem V6 Acquiring Suite",
    description: "Acquiring SSV6",
    articles: [
      { code: "SSV6-ATM", nom: "ATM Acquiring SSV6", uniteVolume: "ATM" },
      { code: "SSV6-POS", nom: "POS Acquiring SSV6", uniteVolume: "terminaux" },
      { code: "SSV6-VISA", nom: "Visa POS/ATM/Ecom acquiring", uniteVolume: "transactions/mois" },
      {
        code: "SSV6-MC",
        nom: "Mastercard POS/ATM/Ecom acquiring",
        uniteVolume: "transactions/mois",
      },
    ],
  },
  {
    code: "SSV6-ISS",
    nom: "SelectSystem V6 Issuing Suite",
    description: "Issuing SSV6",
    articles: [
      { code: "SSV6-DEBIT", nom: "Debit Card SSV6", uniteVolume: "cartes actives" },
      { code: "SSV6-CREDIT", nom: "Credit Card SSV6", uniteVolume: "cartes actives" },
    ],
  },
  {
    code: "SOFTPOS",
    nom: "SoftPOS",
    description: "Application POS sur mobile",
    articles: [{ code: "SOFTPOS-APP", nom: "SoftPOS Application", uniteVolume: "appareils" }],
  },
  {
    code: "WALLET",
    nom: "Wallet Management System",
    description: "Gestion wallets mobiles",
    articles: [{ code: "WALLET-CORE", nom: "Wallet Core", uniteVolume: "comptes actifs" }],
  },
  {
    code: "TOKENISATION",
    nom: "Tokenisation",
    description: "Tokenisation cartes (HCE, NFC)",
    articles: [{ code: "TOKEN-CORE", nom: "Token Engine", uniteVolume: "tokens actifs" }],
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
        ...(a.controleVolume !== undefined ? { controleVolume: a.controleVolume } : {}),
      });
      const savedA = await repos.articleRepo.save(article);
      articleIds.push(savedA.id);
    }
    out.push({ produitId: persisted.id, articleIds });
  }

  log.info({ produits: out.length, articles: out.reduce((s, o) => s + o.articleIds.length, 0) });
  return out;
}

async function loadAllLicenceIds(sql: postgres.Sql): Promise<readonly string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM lic_licences ORDER BY reference ASC
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
  // Distribution Phase 17 D3 : 100% des licences reçoivent 1 produit + 2 à 3
  // articles (cap min(3, |articles|)). Filtre richCatalogue = produits avec
  // ≥2 articles pour garantir le minimum demandé. Les produits 1-article
  // (SOFTPOS, WALLET, TOKENISATION) restent dans le catalogue mais ne sont
  // pas distribués automatiquement — disponibles pour ajout manuel UI.
  const richCatalogue = catalogue.filter((c) => c.articleIds.length >= 2);
  log.info(
    { licences: licenceIds.length, richProduits: richCatalogue.length },
    "Seeding licence-produits + licence-articles (100% des licences)",
  );

  const articleAttachments: { licenceId: string; articleId: number; volumeAutorise: number }[] = [];

  for (let i = 0; i < licenceIds.length; i++) {
    const licenceId = licenceIds[i];
    if (licenceId === undefined) continue;
    const cat = richCatalogue[i % richCatalogue.length];
    if (cat === undefined) continue;

    // Au moins 2-3 articles par licence (cap par taille du produit choisi).
    const nArticles = Math.min(3, cat.articleIds.length);

    await repos.db.transaction(async (tx) => {
      const liaison = LicenceProduit.create({ licenceId, produitId: cat.produitId });
      const savedLP = await repos.licProduitRepo.save(liaison, SYSTEM_USER_ID, tx);
      await auditAdd(repos, tx, "licence-produit", savedLP.id, savedLP.toAuditSnapshot());

      for (let aIdx = 0; aIdx < nArticles; aIdx++) {
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

/** Phase 19 R-13 — aligne controle_volume sur les articles fonctionnalités
 *  (UPDATE idempotent post-INSERT, appliqué même si seed déjà en place). */
async function applyControleVolumeOverrides(sql: postgres.Sql): Promise<void> {
  log.info("Phase 19 R-13 — overrides controle_volume sur articles fonctionnalités");
  await sql`
    UPDATE lic_articles_ref SET controle_volume = false
    WHERE code IN ('ATM-ADV', 'POS-ADV', 'SSV6-FRAUD')
  `;
}

export async function seedPhase6Catalogue(sql: postgres.Sql): Promise<void> {
  log.info("Phase 6.E — seed démo catalogue + liaisons + volume history");

  if (await alreadySeeded(sql)) {
    log.info("lic_produits_ref déjà peuplée — seed Phase 6 INSERT skip (idempotent)");
    // Phase 19 R-13 — l'override controle_volume doit s'appliquer même si
    // les articles sont déjà seedés (alignement BD démo existante).
    await applyControleVolumeOverrides(sql);
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
  await applyControleVolumeOverrides(sql);
  const licenceIds = await loadAllLicenceIds(sql);
  if (licenceIds.length === 0) {
    log.warn("Aucune licence seedée Phase 5 — Phase 6 liaisons skip");
    return;
  }
  const attachments = await seedLicenceLiaisons(repos, catalogue, licenceIds);
  await seedVolumeSnapshots(repos, attachments);

  log.info({ licences: licenceIds.length }, "Phase 6.E seed completed");
}
