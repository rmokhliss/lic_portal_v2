// ==============================================================================
// LIC v2 — GenerateLicenceFichierUseCase (Phase 10.C + Phase 14 — PKI bouclage)
//
// Génère un fichier `.lic` structuré (JSON contenu + signature RSA + cert
// client embarqué) selon ADR-0002. Trace via fichier-log (statut GENERATED).
//
// Mode PKI (Phase 14, DETTE-LIC-008 résolue) :
//   - Lecture des credentials client (lic_clients.client_*) — throw 411 si
//     absents (cas client legacy pré-Phase-3 sans backfill).
//   - Déchiffrement de la clé privée client (AES-256-GCM, APP_MASTER_KEY).
//   - Signature RSASSA-PKCS1-v1_5 du JSON contenu (RFC 8017 §8.2 + ADR-0019).
//   - Format .lic = JSON + séparateur "--- SIGNATURE S2M ---" + signature
//     base64 + "--- CERTIFICATE S2M ---" + cert PEM client.
//   - Hash SHA-256 calculé sur le PAYLOAD COMPLET signé (pas seulement JSON).
//
// Mode legacy (rétrocompat tests d'intégration sans PKI) :
//   - `options` non fourni → JSON brut + hash sur JSON (pre-Phase 14).
// ==============================================================================

import { createHash } from "node:crypto";

import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";
import type { ClientRepository } from "@/server/modules/client/ports/client.repository";
import { decryptAes256Gcm } from "@/server/modules/crypto/domain/aes";
import { signPayload } from "@/server/modules/crypto/domain/rsa";
import { caAbsentOrInvalid } from "@/server/modules/crypto/domain/x509.errors";
import type { EntiteRepository } from "@/server/modules/entite/ports/entite.repository";
import { licenceNotFoundById } from "@/server/modules/licence/domain/licence.errors";
import type { LicenceRepository } from "@/server/modules/licence/ports/licence.repository";
import type { LicenceArticleRepository } from "@/server/modules/licence-article/ports/licence-article.repository";
import { InternalError } from "@/server/modules/error";

import type { FichierLogDTO } from "../adapters/postgres/fichier-log.mapper";
import type { LogFichierGenereUseCase } from "./log-fichier-genere.usecase";

export interface GenerateLicenceFichierInput {
  readonly licenceId: string;
}

export interface GenerateLicenceFichierOptions {
  /** Clé maîtresse AES-256 base64 — `env.APP_MASTER_KEY`. Injectée par la
   *  Server Action pour déchiffrer la clé privée client (frontière infra/env).
   *  Si absente, mode legacy (JSON brut, sans signature). */
  readonly appMasterKey: string;
}

export const SIGNATURE_SEPARATOR = "\n--- SIGNATURE S2M ---\n";
export const CERTIFICATE_SEPARATOR = "\n--- CERTIFICATE S2M ---\n";

export interface LicenceFichierContent {
  readonly version: 1;
  readonly reference: string;
  readonly clientCode: string;
  readonly clientRaisonSociale: string;
  readonly entiteNom: string;
  readonly dateDebut: string;
  readonly dateFin: string;
  readonly articles: readonly {
    readonly code: string;
    readonly nom: string;
    /** Phase 23 — null = volume non défini (article fonctionnalité ou
     *  article volumétrique non encore plafonné côté admin). Equivalent
     *  métier d'illimité pour le client consommateur du .lic. */
    readonly volAutorise: number | null;
    readonly uniteVolume: string;
  }[];
  readonly generatedAt: string;
}

export interface GenerateLicenceFichierOutput {
  readonly content: LicenceFichierContent;
  /** JSON brut du contenu — sans signature ni cert. */
  readonly contentJson: string;
  /** Payload final servi à l'utilisateur. En mode PKI : JSON + sep + sig + cert.
   *  En mode legacy (sans options) : identique à contentJson. */
  readonly signedPayload: string;
  /** Signature RSA base64 du contentJson. null en mode legacy. */
  readonly signatureBase64: string | null;
  /** SHA-256 hex du `signedPayload` (PKI) ou du `contentJson` (legacy). */
  readonly hash: string;
  readonly fichierLog: FichierLogDTO;
}

export class GenerateLicenceFichierUseCase {
  constructor(
    private readonly licenceRepository: LicenceRepository,
    private readonly clientRepository: ClientRepository,
    private readonly entiteRepository: EntiteRepository,
    private readonly licenceArticleRepository: LicenceArticleRepository,
    private readonly articleRepository: ArticleRepository,
    private readonly logFichierGenereUseCase: LogFichierGenereUseCase,
  ) {}

  async execute(
    input: GenerateLicenceFichierInput,
    actorId: string,
    options?: GenerateLicenceFichierOptions,
  ): Promise<GenerateLicenceFichierOutput> {
    const licence = await this.licenceRepository.findById(input.licenceId);
    if (licence === null) throw licenceNotFoundById(input.licenceId);

    const client = await this.clientRepository.findById(licence.clientId);
    if (client === null) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: `Client introuvable pour licence ${licence.id}`,
      });
    }

    const entite = await this.entiteRepository.findById(licence.entiteId);
    if (entite === null) {
      throw new InternalError({
        code: "SPX-LIC-900",
        message: `Entité introuvable pour licence ${licence.id}`,
      });
    }

    const liaisons = await this.licenceArticleRepository.findByLicence(licence.id);
    const articles: {
      code: string;
      nom: string;
      volAutorise: number | null;
      uniteVolume: string;
    }[] = [];
    for (const la of liaisons) {
      const article = await this.articleRepository.findById(la.articleId);
      articles.push({
        code: article?.code ?? `#${String(la.articleId)}`,
        nom: article?.nom ?? "Article inconnu",
        volAutorise: la.volumeAutorise,
        uniteVolume: article?.uniteVolume ?? "transactions",
      });
    }

    const content: LicenceFichierContent = {
      version: 1,
      reference: licence.reference,
      clientCode: client.codeClient,
      clientRaisonSociale: client.raisonSociale,
      entiteNom: entite.nom,
      dateDebut: licence.dateDebut.toISOString(),
      dateFin: licence.dateFin.toISOString(),
      articles,
      generatedAt: new Date().toISOString(),
    };

    const contentJson = JSON.stringify(content, null, 2);

    // Phase 14 — PKI bouclage (DETTE-LIC-008 résolue).
    // Mode PKI activé seulement si options.appMasterKey injecté (Server Action).
    // Mode legacy (tests d'intégration sans PKI) si options absent.
    let signedPayload = contentJson;
    let signatureBase64: string | null = null;

    if (options !== undefined) {
      const credentials = await this.clientRepository.findClientCredentials(client.id);
      if (credentials === null) {
        throw caAbsentOrInvalid(
          `Client ${client.codeClient} sans certificat. Lancer le backfill ou regénérer le client.`,
        );
      }
      const privateKeyPem = decryptAes256Gcm(credentials.privateKeyEnc, options.appMasterKey);
      signatureBase64 = signPayload(contentJson, privateKeyPem);
      signedPayload =
        contentJson +
        SIGNATURE_SEPARATOR +
        signatureBase64 +
        CERTIFICATE_SEPARATOR +
        credentials.certificatePem;
    }

    const hash = createHash("sha256").update(signedPayload, "utf8").digest("hex");

    const path = `lic/${licence.reference}-${Date.now().toString()}.lic`;
    const fichierLog = await this.logFichierGenereUseCase.execute({
      licenceId: licence.id,
      path,
      hash,
      metadata: {
        articlesCount: articles.length,
        clientCode: client.codeClient,
        signed: signatureBase64 !== null,
      },
      creePar: actorId,
    });

    return { content, contentJson, signedPayload, signatureBase64, hash, fichierLog };
  }
}
