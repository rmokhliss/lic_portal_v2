// ==============================================================================
// LIC v2 — Seed démo Phase 8 / Phase 17 D5 — 10 notifications démo
//
// ⚠️  DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS
// ⚠️  NE PAS LANCER EN CI (R-29).
//
// Lancé après seedPhase6Catalogue. Crée 10 notifications démo (5 lues + 5
// non-lues) pour le SADMIN seed (admin@s2m.ma) afin de peupler /notifications
// + le compteur sidebar dès la première session.
//
// Pas d'audit (notifications = data calculée, volume élevé attendu en prod).
// Idempotent : early return si une notif source=DEMO_SEED existe déjà pour ce
// user.
// ==============================================================================

import type postgres from "postgres";

import { createChildLogger } from "@/server/infrastructure/logger";

const log = createChildLogger("db/seed/phase8-notifications");

interface NotifSeed {
  readonly title: string;
  readonly body: string;
  readonly priority: "INFO" | "WARNING" | "CRITICAL";
  readonly source: string;
  readonly read: boolean;
  /** Offset jours par rapport à NOW pour created_at (0 = aujourd'hui,
   *  -3 = il y a 3 jours, etc.). */
  readonly daysAgo: number;
}

const NOTIF_SEEDS: readonly NotifSeed[] = [
  // Non-lues (5)
  {
    title: "Volume seuil atteint — CDM",
    body: "L'article KERNEL du Crédit du Maroc a dépassé 80% de son volume autorisé.",
    priority: "WARNING",
    source: "VOLUME_THRESHOLD",
    read: false,
    daysAgo: 0,
  },
  {
    title: "Licence proche de l'échéance — CMI",
    body: "La licence du Centre Monétique Interbancaire expire dans 28 jours.",
    priority: "WARNING",
    source: "DATE_THRESHOLD",
    read: false,
    daysAgo: 0,
  },
  {
    title: "Nouvelle demande de renouvellement — BIAT",
    body: "Renouvellement EN_COURS posé pour la BIAT (Tunisie) — à valider.",
    priority: "INFO",
    source: "RENOUVELLEMENT_CREATED",
    read: false,
    daysAgo: 1,
  },
  {
    title: "Healthcheck importé — Attijari Tunisie",
    body: "Fichier .hc reçu et déchiffré. 4 articles mis à jour.",
    priority: "INFO",
    source: "HEALTHCHECK_IMPORTED",
    read: false,
    daysAgo: 2,
  },
  {
    title: "Volume critique — Awash Bank",
    body: "L'article ATM-STD a dépassé 100% de son volume autorisé. Action requise.",
    priority: "CRITICAL",
    source: "VOLUME_THRESHOLD",
    read: false,
    daysAgo: 3,
  },
  // Lues (5)
  {
    title: "Fichier .lic généré — BMCI",
    body: "Le fichier licence BMCI a été généré et signé.",
    priority: "INFO",
    source: "LICENCE_GENERATED",
    read: true,
    daysAgo: 5,
  },
  {
    title: "Renouvellement validé — BNI Côte d'Ivoire",
    body: "Renouvellement validé par Karim ZAOUI (DM Afrique Francophone).",
    priority: "INFO",
    source: "RENOUVELLEMENT_VALIDATED",
    read: true,
    daysAgo: 7,
  },
  {
    title: "Licence expirée — RAWBANK",
    body: "La licence Rawbank (Congo) est passée au statut EXPIRE automatiquement.",
    priority: "WARNING",
    source: "LICENCE_EXPIRED",
    read: true,
    daysAgo: 10,
  },
  {
    title: "Volume seuil atteint — Cihan Bank",
    body: "L'article ISS-CREDIT de Cihan Bank a dépassé 90% de son volume autorisé.",
    priority: "WARNING",
    source: "VOLUME_THRESHOLD",
    read: true,
    daysAgo: 14,
  },
  {
    title: "Backup BD réussi",
    body: "Sauvegarde quotidienne complète à 02h05.",
    priority: "INFO",
    source: "SYSTEM",
    read: true,
    daysAgo: 21,
  },
];

const DEMO_SOURCE_TAG = "DEMO_SEED";

async function alreadySeeded(sql: postgres.Sql, userId: string): Promise<boolean> {
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM lic_notifications
    WHERE user_id = ${userId}::uuid
      AND metadata->>'tag' = ${DEMO_SOURCE_TAG}
  `;
  return Number(rows[0]?.count ?? "0") > 0;
}

async function loadSadminUserId(sql: postgres.Sql): Promise<string | null> {
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM lic_users
    WHERE role = 'SADMIN' AND actif = true
    ORDER BY date_creation ASC
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

export async function seedPhase8Notifications(sql: postgres.Sql): Promise<void> {
  log.info("Phase 17 D5 — seed démo 10 notifications");

  const userId = await loadSadminUserId(sql);
  if (userId === null) {
    log.warn("Aucun SADMIN actif — seed notifications skip");
    return;
  }

  if (await alreadySeeded(sql, userId)) {
    log.info("Notifications démo déjà seedées — seed Phase 8 skip (idempotent)");
    return;
  }

  for (const seed of NOTIF_SEEDS) {
    const createdAt = new Date(Date.now() - seed.daysAgo * 24 * 60 * 60 * 1000);
    const readAt = seed.read ? createdAt : null;
    // INSERT direct (pas de repository — la table est append-only et le seed
    // n'a pas besoin de l'audit `Notification.create()` qui pose les defaults).
    await sql`
      INSERT INTO lic_notifications (
        user_id, title, body, priority, source, metadata,
        read, read_at, created_at
      ) VALUES (
        ${userId}::uuid,
        ${seed.title},
        ${seed.body},
        ${seed.priority},
        ${seed.source},
        ${JSON.stringify({ tag: DEMO_SOURCE_TAG })}::jsonb,
        ${seed.read},
        ${readAt},
        ${createdAt}
      )
    `;
  }

  log.info({ count: NOTIF_SEEDS.length }, "Phase 17 D5 seed completed");
}
