// ==============================================================================
// LIC v2 — GenerateLicenceFichierUseCase (Phase 10.C)
//
// Génère un fichier JSON structuré représentant le contenu d'une licence
// (référence, dates, articles + volumes autorisés). Calcule le SHA256 du
// contenu sérialisé. Trace via fichier-log (statut GENERATED).
//
// ⚠️  STUB PKI — Phase 3 différée (DETTE-LIC-008) :
//     - Pas de signature RSA du contenu
//     - Pas de chiffrement AES de la payload
//     - Pas d'embedding du certificat client signé par la CA
//   À ce stade, le fichier JSON brut est retourné en clair, accompagné du
//   hash SHA256 pour vérification d'intégrité élémentaire (anti-altération
//   après téléchargement, mais pas anti-forge).
// ==============================================================================

import { createHash } from "node:crypto";

import type { ArticleRepository } from "@/server/modules/article/ports/article.repository";
import type { ClientRepository } from "@/server/modules/client/ports/client.repository";
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
    readonly volAutorise: number;
    readonly uniteVolume: string;
  }[];
  readonly generatedAt: string;
}

export interface GenerateLicenceFichierOutput {
  readonly content: LicenceFichierContent;
  readonly contentJson: string;
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
      volAutorise: number;
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
    const hash = createHash("sha256").update(contentJson, "utf8").digest("hex");

    // TODO Phase 3 PKI (DETTE-LIC-008) :
    //   1. Charger la clé privée client depuis lic_licence_certificates (table à créer)
    //   2. RSA-sign(contentJson) → signature
    //   3. Embed { content, signature, certPem } dans le payload final
    //   4. Optionnel : AES-encrypt avec licence_file_aes_key (settings)

    const path = `lic/${licence.reference}-${Date.now().toString()}.lic`;
    const fichierLog = await this.logFichierGenereUseCase.execute({
      licenceId: licence.id,
      path,
      hash,
      metadata: {
        articlesCount: articles.length,
        clientCode: client.codeClient,
      },
      creePar: actorId,
    });

    return { content, contentJson, hash, fichierLog };
  }
}
