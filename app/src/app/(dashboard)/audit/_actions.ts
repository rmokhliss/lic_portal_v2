// ==============================================================================
// LIC v2 — Server Actions /audit (Phase 7.C)
//
// Garde ADMIN/SADMIN. Filtres période + action + acteur + entité.
// Export CSV via use-case dédié — refusé si > 50000 lignes (SPX-LIC-755).
// ==============================================================================

"use server";

import { z } from "zod";

import { requireRole } from "@/server/infrastructure/auth";
import {
  exportAuditCsvUseCase,
  getClientUseCase,
  getEntiteUseCase,
  getLicenceUseCase,
  listArticlesUseCase,
  listProduitsUseCase,
  listUsersUseCase,
  searchAuditUseCase,
} from "@/server/composition-root";

const SearchAuditQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    action: z.string().max(40).optional(),
    acteur: z.string().max(200).optional(),
    entity: z.string().max(40).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .strict();

function toFilters(parsed: z.infer<typeof SearchAuditQuerySchema>) {
  return {
    ...(parsed.cursor !== undefined ? { cursor: parsed.cursor } : {}),
    ...(parsed.action !== undefined ? { action: parsed.action } : {}),
    ...(parsed.acteur !== undefined ? { userDisplayLike: parsed.acteur } : {}),
    ...(parsed.entity !== undefined ? { entity: parsed.entity } : {}),
    ...(parsed.fromDate !== undefined && parsed.fromDate !== ""
      ? { fromDate: new Date(parsed.fromDate) }
      : {}),
    ...(parsed.toDate !== undefined && parsed.toDate !== ""
      ? { toDate: new Date(parsed.toDate) }
      : {}),
    limit: 50,
  };
}

export async function searchAuditAction(input: unknown) {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = SearchAuditQuerySchema.parse(input);
  return searchAuditUseCase.execute(toFilters(parsed));
}

export async function exportAuditCsvAction(input: unknown): Promise<{ csv: string }> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = SearchAuditQuerySchema.parse(input);
  // Export ignore le cursor (export complet pour les filtres demandés).
  const filters = toFilters(parsed);
  const { cursor: _cursor, limit: _limit, ...exportFilters } = filters;
  void _cursor;
  void _limit;
  const csv = await exportAuditCsvUseCase.execute(exportFilters);
  return { csv };
}

// ============================================================================
// Phase 24 — Résolveur d'identifiants pour le drilldown audit
//
// Le DrilldownDialog scanne afterData/beforeData pour les clés `clientId`,
// `entiteId`, `licenceId`, `userId`, `articleId`, `produitId`, puis appelle
// cette action UNE FOIS pour résoudre tous les UUIDs en libellés affichables.
// Évite que le user lise des UUIDs bruts ; affiche un panneau "Identifiants
// résolus" en complément du JSON.
// ============================================================================

const ResolveAuditIdsSchema = z
  .object({
    clientIds: z.array(z.uuid()).max(50).optional(),
    entiteIds: z.array(z.uuid()).max(50).optional(),
    licenceIds: z.array(z.uuid()).max(50).optional(),
    userIds: z.array(z.uuid()).max(50).optional(),
    articleIds: z.array(z.number().int().positive()).max(100).optional(),
    produitIds: z.array(z.number().int().positive()).max(100).optional(),
  })
  .strict();

export interface ResolveAuditIdsResult {
  readonly clients: Record<string, string>;
  readonly entites: Record<string, string>;
  readonly licences: Record<string, string>;
  readonly users: Record<string, string>;
  readonly articles: Record<string, string>;
  readonly produits: Record<string, string>;
}

export async function resolveAuditIdsAction(input: unknown): Promise<ResolveAuditIdsResult> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = ResolveAuditIdsSchema.parse(input);

  type Pair = readonly [string, string] | null;
  const [clients, entites, licences, users, articlesAll, produits] = await Promise.all([
    Promise.all(
      (parsed.clientIds ?? []).map(async (id): Promise<Pair> => {
        try {
          const c = await getClientUseCase.execute(id);
          return [id, `${c.codeClient} · ${c.raisonSociale}`];
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      (parsed.entiteIds ?? []).map(async (id): Promise<Pair> => {
        try {
          const e = await getEntiteUseCase.execute(id);
          return [id, e.nom];
        } catch {
          return null;
        }
      }),
    ),
    Promise.all(
      (parsed.licenceIds ?? []).map(async (id): Promise<Pair> => {
        try {
          const l = await getLicenceUseCase.execute(id);
          return [id, l.reference];
        } catch {
          return null;
        }
      }),
    ),
    // Pas de getUserUseCase — on consomme listUsersUseCase et on filtre en
    // mémoire. Volume cible mono-tenant <100 users → coût acceptable.
    parsed.userIds !== undefined && parsed.userIds.length > 0
      ? listUsersUseCase
          .execute({})
          .then((all) =>
            all
              .filter((u) => parsed.userIds?.includes(u.id))
              .map((u) => [u.id, u.display] as const),
          )
          .catch(() => [] as readonly (readonly [string, string])[])
      : Promise.resolve([] as readonly (readonly [string, string])[]),
    parsed.articleIds !== undefined && parsed.articleIds.length > 0
      ? listArticlesUseCase
          .execute({})
          .then((arts) =>
            arts
              .filter((a) => parsed.articleIds?.includes(a.id))
              .map((a) => [String(a.id), `${a.code} · ${a.nom}`] as const),
          )
          .catch(() => [] as readonly (readonly [string, string])[])
      : Promise.resolve([] as readonly (readonly [string, string])[]),
    // Pas de getProduitById — getProduitUseCase prend un code business. On
    // consomme listProduitsUseCase et on filtre par id (volume <50 produits).
    parsed.produitIds !== undefined && parsed.produitIds.length > 0
      ? listProduitsUseCase
          .execute({})
          .then((prods) =>
            prods
              .filter((p) => parsed.produitIds?.includes(p.id))
              .map((p) => [String(p.id), `${p.code} · ${p.nom}`] as const),
          )
          .catch(() => [] as readonly (readonly [string, string])[])
      : Promise.resolve([] as readonly (readonly [string, string])[]),
  ]);

  const notNull = (x: Pair): x is readonly [string, string] => x !== null;
  return {
    clients: Object.fromEntries(clients.filter(notNull)),
    entites: Object.fromEntries(entites.filter(notNull)),
    licences: Object.fromEntries(licences.filter(notNull)),
    users: Object.fromEntries(users),
    articles: Object.fromEntries(articlesAll),
    produits: Object.fromEntries(produits),
  };
}
