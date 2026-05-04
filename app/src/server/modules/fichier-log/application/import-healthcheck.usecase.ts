// ==============================================================================
// LIC v2 — ImportHealthcheckUseCase (Phase 10.D)
//
// Parse un fichier healthcheck (JSON ou CSV) déposé via UI et applique les
// volumes consommés sur les liaisons licence-article. Trace via fichier-log
// (statut IMPORTED ou ERREUR).
//
// Format JSON attendu :
//   {
//     "licenceReference": "LIC-2026-001",
//     "articles": [{ "code": "USERS", "volConsomme": 250 }, ...]
//   }
//
// Format CSV attendu :
//   article_code,vol_consomme
//   USERS,250
//   TX-MOIS,1500
//
// Pour chaque article du payload :
//   - lookup article par code
//   - lookup liaison licence-article (licenceId + articleId)
//   - appel updateArticleVolumeUseCase (audit MANUEL — l'utilisateur déclenche)
//
// ⚠️  STUB PKI — Phase 3 différée (DETTE-LIC-008) :
//     - Pas de vérification de signature certificat client
//     - Pas de validation que le fichier provient bien de la licence cible
//   À ce stade, n'importe qui ayant accès UI peut uploader n'importe quoi.
//   La sécurité repose sur la garde Server Action (ADMIN/SADMIN).
// ==============================================================================

import { createHash } from "node:crypto";

import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";
import { ValidationError } from "@/server/modules/error";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { LicenceArticleRepository } from "@/server/modules/licence-article/ports/licence-article.repository";
import type { UpdateArticleVolumeUseCase } from "@/server/modules/licence-article/application/update-article-volume.usecase";

import type { FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { LogHealthcheckImporteUseCase } from "./log-healthcheck-importe.usecase";

export interface ImportHealthcheckInput {
  readonly licenceId: string;
  readonly filename: string;
  readonly content: string;
}

export interface ImportHealthcheckOutput {
  readonly fichierLog: FichierLogDTO;
  readonly updated: number;
  readonly errors: number;
  readonly errorDetails: readonly string[];
}

interface ParsedArticleEntry {
  readonly code: string;
  readonly volConsomme: number;
}

export class ImportHealthcheckUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly articleRepository: ArticleRepository,
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly updateArticleVolumeUseCase: UpdateArticleVolumeUseCase,
    private readonly logHealthcheckImporteUseCase: LogHealthcheckImporteUseCase,
  ) {}

  async execute(input: ImportHealthcheckInput, actorId: string): Promise<ImportHealthcheckOutput> {
    const licence = await this.licenceRepository.findById(input.licenceId);
    if (licence === null) throw licenceNotFoundById(input.licenceId);

    const hash = createHash("sha256").update(input.content, "utf8").digest("hex");
    const path = `healthcheck/${licence.reference}-${Date.now().toString()}-${input.filename}`;

    let entries: readonly ParsedArticleEntry[];
    try {
      entries = parseHealthcheck(input.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Format invalide";
      const fichierLog = await this.logHealthcheckImporteUseCase.execute({
        licenceId: licence.id,
        path,
        hash,
        statut: "ERREUR",
        errorMessage: message,
        creePar: actorId,
      });
      // TODO Phase 3 PKI : vérifier signature certificat client avant parse.
      throw new ValidationError({
        code: "SPX-LIC-901",
        message: `Healthcheck illisible : ${message}`,
        details: { fichierLogId: fichierLog.id },
      });
    }

    let updated = 0;
    const errorDetails: string[] = [];

    for (const entry of entries) {
      try {
        // Lookup article par code (code unique mais on prend le 1er — un même
        // code peut exister sur plusieurs produits ; pour le healthcheck on
        // suppose unicité côté business, à raffiner Phase 13 si besoin).
        const articles = await this.articleRepository.findAll({ actif: true });
        const article = articles.find((a) => a.code === entry.code);
        if (article === undefined) {
          errorDetails.push(`Article "${entry.code}" introuvable dans le catalogue`);
          continue;
        }

        const liaison = await this.licenceArticleRepository.findByLicenceArticle(
          licence.id,
          article.id,
        );
        if (liaison === null) {
          errorDetails.push(`Article "${entry.code}" non attaché à la licence`);
          continue;
        }

        await this.updateArticleVolumeUseCase.execute(
          { id: liaison.id, volumeConsomme: entry.volConsomme },
          actorId,
        );
        updated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errorDetails.push(`${entry.code}: ${message}`);
      }
    }

    const errors = errorDetails.length;
    const fichierLog = await this.logHealthcheckImporteUseCase.execute({
      licenceId: licence.id,
      path,
      hash,
      statut: errors > 0 && updated === 0 ? "ERREUR" : "IMPORTED",
      metadata: {
        filename: input.filename,
        totalEntries: entries.length,
        updated,
        errors,
        errorDetails,
      },
      ...(errors > 0 ? { errorMessage: `${String(errors)} erreur(s) — voir metadata` } : {}),
      creePar: actorId,
    });

    return { fichierLog, updated, errors, errorDetails };
  }
}

// ----------------------------------------------------------------------------
// Parsing helpers — détection du format par préfixe (JSON commence par '{' ou
// '['), sinon CSV.
// ----------------------------------------------------------------------------

function parseHealthcheck(content: string): readonly ParsedArticleEntry[] {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new TypeError("Contenu vide");
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonHealthcheck(trimmed);
  }
  return parseCsvHealthcheck(trimmed);
}

function parseJsonHealthcheck(content: string): readonly ParsedArticleEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new TypeError(`JSON invalide: ${err instanceof Error ? err.message : "?"}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new TypeError("JSON doit être un objet ou un tableau");
  }
  const articlesRaw = Array.isArray(parsed) ? parsed : (parsed as { articles?: unknown }).articles;
  if (!Array.isArray(articlesRaw)) {
    throw new TypeError("Champ 'articles' manquant ou non-tableau");
  }
  return articlesRaw.map((entry: unknown, idx) => {
    if (typeof entry !== "object" || entry === null) {
      throw new TypeError(`Article #${String(idx)} non-objet`);
    }
    const e = entry as { code?: unknown; volConsomme?: unknown; vol_consomme?: unknown };
    const code = typeof e.code === "string" ? e.code : null;
    const volRaw = e.volConsomme ?? e.vol_consomme;
    const vol = typeof volRaw === "number" ? volRaw : null;
    if (code === null || vol === null) {
      throw new TypeError(`Article #${String(idx)} : code ou volConsomme manquant`);
    }
    return { code, volConsomme: vol };
  });
}

function parseCsvHealthcheck(content: string): readonly ParsedArticleEntry[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new TypeError("CSV doit avoir au moins une ligne d'en-tête + une ligne de données");
  }
  const header = lines[0];
  if (header === undefined) throw new TypeError("CSV header absent");
  const cols = header.split(",").map((c) => c.trim().toLowerCase());
  const codeIdx = cols.indexOf("article_code");
  const volIdx = cols.indexOf("vol_consomme");
  if (codeIdx === -1 || volIdx === -1) {
    throw new TypeError("CSV header doit contenir 'article_code' et 'vol_consomme'");
  }
  const out: ParsedArticleEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const cells = line.split(",").map((c) => c.trim());
    const code = cells[codeIdx];
    const volStr = cells[volIdx];
    if (code === undefined || volStr === undefined) continue;
    const vol = Number(volStr);
    if (!Number.isFinite(vol)) {
      throw new TypeError(`Ligne ${String(i + 1)} : vol_consomme "${volStr}" non numérique`);
    }
    out.push({ code, volConsomme: vol });
  }
  return out;
}
