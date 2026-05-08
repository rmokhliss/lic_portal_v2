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
// Format JSON aligné sur `.lic` (Phase 24 — unifié) :
//   {
//     "version": 1,
//     "reference": "LIC-2026-001",
//     "clientCode": "BAMIS",
//     "clientRaisonSociale": "...",
//     "entiteNom": "BAMIS MR",
//     "dateDebut": "2026-05-08T00:00:00.000Z",
//     "dateFin": "2028-05-08T00:00:00.000Z",
//     "articles": [
//       { "code": "KERNEL", "nom": "...", "volume": 0 },
//       { "code": "HSM", "nom": "...", "volume": null }   // article non-vol.
//     ],
//     "generatedAt": "..."
//   }
// `volume: null` = volume non rapporté (article non-volumétrique ou non
// instrumenté côté client) → l'entrée est tracée mais le volume consommé
// n'est pas mis à jour pour la liaison.
//
// Formats legacy tolérés :
//   - JSON `{ "licenceReference": "...", "articles": [{ "code": "X",
//     "volConsomme": 250 }] }` — Phase 10.D pré-Phase-24.
//   - CSV `article_code,vol_consomme` (alias `volume`).
//
// Rapport d'intégration retourné + métadonnées fichier-log :
//   - articlesUpdated      : liaisons effectivement mises à jour (count)
//   - articlesSkipped      : articles dans .hc avec volume null (count + codes)
//   - articlesOutOfContract: articles dans .hc absents de la licence (codes)
//   - articlesNotInCatalog : articles dans .hc absents du catalogue (codes)
//   - errorDetails         : autres erreurs unitaires (parsing par article)
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
  /** Phase 24 — articles dans .hc avec volume null (non instrumenté côté
   *  client). Pas une erreur, juste tracé. */
  readonly articlesSkipped: readonly string[];
  /** Phase 24 — articles présents dans .hc mais NON attachés à la licence
   *  (utilisation hors-contrat à ajouter au contrat ou désinstaller). */
  readonly articlesOutOfContract: readonly string[];
  /** Phase 24 — articles présents dans .hc mais introuvables dans le
   *  catalogue (référentiel article incomplet ou code inconnu). */
  readonly articlesNotInCatalog: readonly string[];
  /** Phase 24 — sanity-check : la `reference` du .hc matche-t-elle la
   *  licence ciblée ? null = champ absent du .hc (legacy). false = mismatch. */
  readonly referenceMatch: boolean | null;
}

interface ParsedHealthcheckPayload {
  /** null si format legacy sans champ reference. */
  readonly reference: string | null;
  readonly entries: readonly ParsedArticleEntry[];
}

interface ParsedArticleEntry {
  readonly code: string;
  /** Phase 24 — null = volume non rapporté (champ `volume: null` dans .hc).
   *  L'import note l'article mais ne met pas à jour le volume consommé. */
  readonly volConsomme: number | null;
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

    let payload: ParsedHealthcheckPayload;
    try {
      payload = parseHealthcheck(plaintext);
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

    const referenceMatch =
      payload.reference === null ? null : payload.reference === licence.reference;

    let updated = 0;
    const errorDetails: string[] = [];
    const articlesSkipped: string[] = [];
    const articlesOutOfContract: string[] = [];
    const articlesNotInCatalog: string[] = [];

    // Lookup catalogue + liaisons une fois (au lieu de N+1 dans la boucle).
    const allArticles = await this.articleRepository.findAll({ actif: true });
    const articleByCode = new Map(allArticles.map((a) => [a.code, a] as const));

    for (const entry of payload.entries) {
      try {
        const article = articleByCode.get(entry.code);
        if (article === undefined) {
          articlesNotInCatalog.push(entry.code);
          continue;
        }

        const liaison = await this.licenceArticleRepository.findByLicenceArticle(
          licence.id,
          article.id,
        );
        if (liaison === null) {
          articlesOutOfContract.push(entry.code);
          continue;
        }

        // Phase 24 — volume:null = pas de mise à jour (article non-vol. côté
        // client ou volume non instrumenté). On note dans le rapport.
        if (entry.volConsomme === null) {
          articlesSkipped.push(entry.code);
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

    // Préfixe les listes catégorisées dans errorDetails pour rétrocompat UI
    // (les anciens consommateurs lisent juste `errorDetails`).
    const fullErrorDetails = [
      ...articlesOutOfContract.map((c) => `Article "${c}" non attaché à la licence (hors contrat)`),
      ...articlesNotInCatalog.map((c) => `Article "${c}" introuvable dans le catalogue`),
      ...errorDetails,
    ];
    const errors = fullErrorDetails.length;

    const fichierLog = await this.logHealthcheckImporteUseCase.execute({
      licenceId: licence.id,
      path,
      hash,
      // Phase 24 — un import avec uniquement des "out-of-contract" reste OK
      // (statut IMPORTED) si au moins une mise à jour a réussi OU si tout
      // était simplement hors-contrat (pas d'erreur de format). On ne bascule
      // en ERREUR que si zéro update ET au moins une erreur structurelle
      // (entry parsing, etc.).
      statut: errors > 0 && updated === 0 && articlesSkipped.length === 0 ? "ERREUR" : "IMPORTED",
      metadata: {
        filename: input.filename,
        reference: payload.reference,
        referenceMatch,
        totalEntries: payload.entries.length,
        updated,
        errors,
        errorDetails: fullErrorDetails,
        articlesSkipped,
        articlesOutOfContract,
        articlesNotInCatalog,
      },
      ...(errors > 0 ? { errorMessage: `${String(errors)} erreur(s) — voir metadata` } : {}),
      creePar: actorId,
    });

    return {
      fichierLog,
      updated,
      errors,
      errorDetails: fullErrorDetails,
      articlesSkipped,
      articlesOutOfContract,
      articlesNotInCatalog,
      referenceMatch,
    };
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

function parseHealthcheck(content: string): ParsedHealthcheckPayload {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new TypeError("Contenu vide");
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonHealthcheck(trimmed);
  }
  return { reference: null, entries: parseCsvHealthcheck(trimmed) };
}

function parseJsonHealthcheck(content: string): ParsedHealthcheckPayload {
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

  // Phase 24 — extraction de la référence (alignement format .lic).
  // Accepte aussi `licenceReference` (legacy Phase 10.D).
  let reference: string | null = null;
  if (!Array.isArray(parsed)) {
    const obj = parsed as { reference?: unknown; licenceReference?: unknown };
    if (typeof obj.reference === "string" && obj.reference.length > 0) {
      reference = obj.reference;
    } else if (typeof obj.licenceReference === "string" && obj.licenceReference.length > 0) {
      reference = obj.licenceReference;
    }
  }

  const entries = articlesRaw.map((entry: unknown, idx): ParsedArticleEntry => {
    if (typeof entry !== "object" || entry === null) {
      throw new TypeError(`Article #${String(idx)} non-objet`);
    }
    // Phase 24 — alias `volume` (champ unifié .lic/.hc) accepté + alias
    // legacy `volConsomme` / `vol_consomme`.
    const e = entry as {
      code?: unknown;
      volume?: unknown;
      volConsomme?: unknown;
      vol_consomme?: unknown;
    };
    const code = typeof e.code === "string" && e.code.length > 0 ? e.code : null;
    if (code === null) {
      throw new TypeError(`Article #${String(idx)} : code manquant`);
    }
    // On distingue "absence de champ" (undefined) de "valeur null explicite".
    // - Tous undefined  → erreur (champ volume absent)
    // - null explicite  → volConsomme=null (article non-volumétrique côté .hc)
    // - number          → utilisé tel quel
    // - autre type      → erreur typage
    const hasVolume =
      e.volume !== undefined || e.volConsomme !== undefined || e.vol_consomme !== undefined;
    if (!hasVolume) {
      throw new TypeError(`Article #${String(idx)} : champ volume absent`);
    }
    const volRaw =
      e.volume !== undefined
        ? e.volume
        : e.volConsomme !== undefined
          ? e.volConsomme
          : e.vol_consomme;
    let volConsomme: number | null;
    if (volRaw === null) {
      volConsomme = null;
    } else if (typeof volRaw === "number" && Number.isFinite(volRaw)) {
      volConsomme = volRaw;
    } else {
      throw new TypeError(
        `Article #${String(idx)} : volume non numérique (${typeof volRaw === "object" ? "object" : typeof volRaw})`,
      );
    }
    return { code, volConsomme };
  });

  return { reference, entries };
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
  // Phase 23 — header `volume` (unifié .lic/.hc) ou `vol_consomme` (legacy).
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
    if (code === undefined || code.length === 0) continue;
    // Phase 24 — cellule volume vide = volume non rapporté (équivalent
    // `null` JSON). Permet d'envoyer un .hc partiel sans casser le parser.
    if (volStr === undefined || volStr.length === 0) {
      out.push({ code, volConsomme: null });
      continue;
    }
    const vol = Number(volStr);
    if (!Number.isFinite(vol)) {
      throw new TypeError(`Ligne ${String(i + 1)} : vol_consomme "${volStr}" non numérique`);
    }
    out.push({ code, volConsomme: vol });
  }
  return out;
}
