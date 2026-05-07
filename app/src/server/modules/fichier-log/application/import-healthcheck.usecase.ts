// ==============================================================================
// LIC v2 — ImportHealthcheckUseCase (Phase 10.D + Phase 14 — AES-GCM bouclage)
//
// Parse un fichier healthcheck déposé via UI et applique les volumes consommés
// sur les liaisons licence-article. Trace via fichier-log (statut IMPORTED ou
// ERREUR).
//
// Format `.hc` Phase 14 (ADR-0002 + ADR-0019) :
//   AES-256-GCM(plaintext, lic_settings.healthcheck_shared_aes_key) →
//   `<iv_b64>:<tag_b64>:<ciphertext_b64>`. Le plaintext déchiffré est ensuite
//   parsé comme JSON ou CSV (fallback compat ascendante).
//
// Format JSON attendu (après déchiffrement) :
//   { "licenceReference": "LIC-2026-001",
//     "articles": [{ "code": "USERS", "volConsomme": 250 }, ...] }
//
// Format CSV attendu (après déchiffrement) :
//   article_code,vol_consomme
//   USERS,250
//
// Mode AES (Phase 14, settingRepository injecté) :
//   - Lecture lic_settings.healthcheck_shared_aes_key — throw 411 si absente
//   - decryptAes256Gcm(uploadedContent, sharedKey) — throw 402 si tag mismatch
//   - parse du plaintext JSON/CSV
//
// Mode legacy (tests d'intégration sans settingRepository) :
//   - parse direct du contenu uploadé (pre-Phase 14)
// ==============================================================================

import { createHash } from "node:crypto";

import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";
import { decryptAes256Gcm } from "@/server/modules/crypto/domain/aes";
import { aesGcmTagMismatch } from "@/server/modules/crypto/domain/aes.errors";
import { caAbsentOrInvalid } from "@/server/modules/crypto/domain/x509.errors";
import { ValidationError } from "@/server/modules/error";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { LicenceArticleRepository } from "@/server/modules/licence-article/ports/licence-article.repository";
import type { UpdateArticleVolumeUseCase } from "@/server/modules/licence-article/application/update-article-volume.usecase";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";

import type { FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { LogHealthcheckImporteUseCase } from "./log-healthcheck-importe.usecase";

export const HEALTHCHECK_SHARED_KEY_SETTING = "healthcheck_shared_aes_key" as const;

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
    /** Phase 14 — optionnel pour rétrocompat tests d'intégration legacy.
     *  Composition-root le câble systématiquement en prod. Si absent → skip
     *  AES decrypt (mode test legacy uniquement). */
    private readonly settingRepository?: SettingRepository,
  ) {}

  async execute(input: ImportHealthcheckInput, actorId: string): Promise<ImportHealthcheckOutput> {
    const licence = await this.licenceRepository.findById(input.licenceId);
    if (licence === null) throw licenceNotFoundById(input.licenceId);

    const hash = createHash("sha256").update(input.content, "utf8").digest("hex");
    const path = `healthcheck/${licence.reference}-${Date.now().toString()}-${input.filename}`;

    // Phase 14 — déchiffrement AES-GCM si settingRepository injecté.
    // Mode legacy (tests sans settingRepository) → passe-plat.
    let plaintext = input.content;
    if (this.settingRepository !== undefined) {
      try {
        plaintext = await decryptHealthcheckContent(input.content, this.settingRepository);
      } catch (err) {
        const message = err instanceof Error ? err.message : "déchiffrement échoué";
        await this.logHealthcheckImporteUseCase.execute({
          licenceId: licence.id,
          path,
          hash,
          statut: "ERREUR",
          errorMessage: `AES decrypt: ${message}`,
          creePar: actorId,
        });
        throw err;
      }
    }

    let entries: readonly ParsedArticleEntry[];
    try {
      entries = parseHealthcheck(plaintext);
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
// Phase 14 — Déchiffrement AES-256-GCM. Lit la clé partagée depuis
// `lic_settings.healthcheck_shared_aes_key`. Throw 411 si absente, 402 si tag
// mismatch (contenu altéré OU clé incorrecte côté banque/S2M).
// ----------------------------------------------------------------------------

async function decryptHealthcheckContent(
  encrypted: string,
  settingRepo: SettingRepository,
): Promise<string> {
  const settings = await settingRepo.findAll();
  const setting = settings.find((s) => s.key === HEALTHCHECK_SHARED_KEY_SETTING);
  const sharedKey = typeof setting?.value === "string" ? setting.value : "";
  if (sharedKey.length === 0) {
    throw caAbsentOrInvalid(
      "Clé partagée healthcheck (`healthcheck_shared_aes_key`) absente. Configurer la clé dans /settings/security.",
    );
  }
  // Phase 23 — accepte deux formats :
  //   1. String brute "iv_b64:tag_b64:ciphertext_b64" (format prod banque)
  //   2. JSON wrapper sandbox { encrypted: "iv:tag:ct", algorithm, encryptedAt }
  //      → extraction du champ `encrypted` avant dechiffrement (le sandbox
  //      enrobe le payload chiffre dans un objet JSON pour traçabilité).
  const trimmed = encrypted.trim();
  let cipherString = trimmed;
  if (trimmed.startsWith("{")) {
    try {
      const wrapper = JSON.parse(trimmed) as { encrypted?: unknown };
      if (typeof wrapper.encrypted === "string" && wrapper.encrypted.length > 0) {
        cipherString = wrapper.encrypted;
      }
    } catch {
      // JSON invalide — on tente le decrypt direct (probable echec mais
      // erreur AES plus parlante que JSON parse error).
    }
  }
  try {
    return decryptAes256Gcm(cipherString, sharedKey);
  } catch (err) {
    if (err instanceof ValidationError && err.code === "SPX-LIC-402") {
      throw aesGcmTagMismatch(
        "Healthcheck altéré ou clé partagée incorrecte (tag d'authentification mismatch).",
      );
    }
    throw err;
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
    // Phase 23 — alias `volume` (champ unifie .lic/.hc) accepte en plus de
    // volConsomme/vol_consomme pour retrocompat.
    const e = entry as {
      code?: unknown;
      volume?: unknown;
      volConsomme?: unknown;
      vol_consomme?: unknown;
    };
    const code = typeof e.code === "string" ? e.code : null;
    const volRaw = e.volume ?? e.volConsomme ?? e.vol_consomme;
    const vol = typeof volRaw === "number" ? volRaw : null;
    if (code === null || vol === null) {
      throw new TypeError(`Article #${String(idx)} : code ou volume manquant`);
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
  // Phase 23 — header `volume` (unifie .lic/.hc) ou `vol_consomme` (legacy).
  const volIdx = cols.includes("volume") ? cols.indexOf("volume") : cols.indexOf("vol_consomme");
  if (codeIdx === -1 || volIdx === -1) {
    throw new TypeError("CSV header doit contenir 'article_code' et 'volume' (ou 'vol_consomme')");
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
