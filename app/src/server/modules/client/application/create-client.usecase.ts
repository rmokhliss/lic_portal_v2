// ==============================================================================
// LIC v2 — CreateClientUseCase (Phase 4.B + Phase 3.D — refactor PKI)
//
// Orchestration transactionnelle (règle L3 — audit dans même tx) :
//   1. Client.create(input) → throw SPX-LIC-726 si validation
//   2. Pré-check CA hors tx — throw SPX-LIC-411 si CA absente
//   3. Génération paire RSA-4096 client + cert client signé par la CA (hors tx)
//   4. db.transaction:
//      a. findByCode(codeClient) → throw SPX-LIC-725 si conflit
//      b. saveWithSiegeEntite(client, ...)
//      c. attachCertificate(clientId, { privateKeyEnc, certPem, expiresAt }, tx)
//      d. audit CLIENT_CREATED + audit CERTIFICATE_ISSUED dans la même tx
//
// Phase 3.D : DETTE-LIC-008 résolue. Le client est créé avec son cert dès
// l'INSERT — plus besoin de backfill ultérieur. Le backfill (3.E) reste utile
// pour les clients préexistants antérieurs à Phase 3.
// ==============================================================================

import { db } from "@/server/infrastructure/db/client";
import { AuditEntry } from "@/server/modules/audit/domain/audit-entry.entity";
import type { AuditRepository } from "@/server/modules/audit/ports/audit.repository";
import { Contact } from "@/server/modules/contact/domain/contact.entity";
import type { ContactRepository } from "@/server/modules/contact/ports/contact.repository";
import {
  CA_SETTING_KEY,
  isCARecord,
  unwrapCAPrivateKey,
} from "@/server/modules/crypto/application/__shared/ca-storage";
import { encryptAes256Gcm } from "@/server/modules/crypto/domain/aes";
import { generateRsaKeyPair } from "@/server/modules/crypto/domain/rsa";
import { generateClientCert, getCertExpiry } from "@/server/modules/crypto/domain/x509";
import { caAbsentOrInvalid } from "@/server/modules/crypto/domain/x509.errors";
import { InternalError } from "@/server/modules/error";
import type { SettingRepository } from "@/server/modules/settings/ports/setting.repository";
import type { UserRepository } from "@/server/modules/user/ports/user.repository";

import { toDTO, type ClientDTO } from "../adapters/postgres/client.mapper";
import { Client, type CreateClientDomainInput } from "../domain/client.entity";
import { clientCodeAlreadyExists } from "../domain/client.errors";
import type { ClientRepository } from "../ports/client.repository";

/** Phase 14 — DETTE-LIC-017 : contact saisi à la création client. Attaché à
 *  l'entité Siège dans la même tx. Le `entiteId` est résolu par le use-case
 *  (siegeEntiteId retourné par saveWithSiegeEntite). */
export interface CreateClientContactInput {
  readonly typeContactCode: string;
  readonly nom: string;
  readonly prenom?: string;
  readonly email?: string;
  readonly telephone?: string;
}

export interface CreateClientUseCaseInput extends CreateClientDomainInput {
  /** Nom de l'entité « Siège » créée dans la même tx. Default = raisonSociale. */
  readonly siegeNom?: string;
  /** Phase 14 — contacts à créer dans la même tx que client + Siège (max 5). */
  readonly contacts?: readonly CreateClientContactInput[];
}

export interface CreateClientUseCaseOptions {
  /** Clé maîtresse AES-256 base64 — `env.APP_MASTER_KEY`. Injectée par le caller
   *  (Server Action) pour éviter une dépendance application/ → infrastructure/env. */
  readonly appMasterKey: string;
}

export interface CreateClientUseCaseOutput {
  readonly client: ClientDTO;
  readonly siegeEntiteId: string;
  /** PEM du certificat client généré, ou null si PKI désactivée (tests legacy). */
  readonly clientCertificatePem: string | null;
  /** Expiration cert client, ou null si PKI désactivée. */
  readonly certificateExpiresAt: Date | null;
}

export class CreateClientUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly userRepository: UserRepository,
    private readonly auditRepository: AuditRepository,
    /** Phase 3.D : optionnel pour rétrocompat tests d'intégration legacy.
     *  Composition-root le câble systématiquement en prod. Si absent → skip PKI
     *  (mode test legacy uniquement). */
    private readonly settingRepository?: SettingRepository,
    /** Phase 14 — DETTE-LIC-017 : optionnel pour rétrocompat. Si absent et
     *  `input.contacts` non vide, throw InternalError. */
    private readonly contactRepository?: ContactRepository,
  ) {}

  async execute(
    input: CreateClientUseCaseInput,
    actorId: string,
    options?: CreateClientUseCaseOptions,
  ): Promise<CreateClientUseCaseOutput> {
    const candidate = Client.create(input);
    const siegeNom = input.siegeNom ?? input.raisonSociale;

    // Phase 3.D : PKI activée seulement si settingRepository ET options injectés.
    // Sinon on retombe sur le chemin legacy (création client sans cert) — mode
    // strictement réservé aux tests d'intégration qui ne testent pas la PKI.
    // En prod (composition-root) ces deux conditions sont toujours vraies.
    const settingRepo = this.settingRepository;
    let clientPrivateKeyEnc: string | null = null;
    let clientCertPem: string | null = null;
    let certificateExpiresAt: Date | null = null;

    if (settingRepo !== undefined && options !== undefined) {
      const settings = await settingRepo.findAll();
      const caSetting = settings.find((s) => s.key === CA_SETTING_KEY);
      if (caSetting === undefined || !isCARecord(caSetting.value)) {
        throw caAbsentOrInvalid(
          "CA S2M non générée. Générer la CA dans /settings/sécurité avant de créer des clients.",
        );
      }
      const caRecord = caSetting.value;
      const caPrivateKeyPem = unwrapCAPrivateKey(caRecord, options.appMasterKey);

      const clientKeys = generateRsaKeyPair();
      clientCertPem = await generateClientCert({
        clientPublicKeyPem: clientKeys.publicKeyPem,
        caPrivateKeyPem,
        caCertPem: caRecord.certificatePem,
        subject: {
          commonName: candidate.raisonSociale,
          org: "S2M",
          serialNumber: candidate.codeClient,
        },
      });
      certificateExpiresAt = getCertExpiry(clientCertPem);
      clientPrivateKeyEnc = encryptAes256Gcm(clientKeys.privateKeyPem, options.appMasterKey);
    }

    const result = await db.transaction(async (tx) => {
      const existing = await this.clientRepository.findByCode(candidate.codeClient, tx);
      if (existing !== null) {
        throw clientCodeAlreadyExists(candidate.codeClient);
      }

      const { client: persistedClient, siegeEntiteId } =
        await this.clientRepository.saveWithSiegeEntite(
          candidate,
          { nom: siegeNom, codePays: candidate.codePays ?? undefined },
          actorId,
          tx,
        );

      if (clientPrivateKeyEnc !== null && clientCertPem !== null && certificateExpiresAt !== null) {
        await this.clientRepository.attachCertificate(
          persistedClient.id,
          {
            privateKeyEnc: clientPrivateKeyEnc,
            certificatePem: clientCertPem,
            expiresAt: certificateExpiresAt,
          },
          tx,
        );
      }

      const actor = await this.userRepository.findByIdEntity(actorId, tx);
      if (actor === null) {
        throw new InternalError({
          code: "SPX-LIC-900",
          message: `Acteur introuvable : ${actorId}`,
        });
      }

      const clientDisplay = `${persistedClient.codeClient} — ${persistedClient.raisonSociale}`;

      const createdEntry = AuditEntry.create({
        entity: "client",
        entityId: persistedClient.id,
        action: "CLIENT_CREATED",
        afterData: {
          ...persistedClient.toAuditSnapshot(),
          siegeEntiteId,
        },
        userId: actor.id,
        userDisplay: actor.toDisplay(),
        clientId: persistedClient.id,
        clientDisplay,
        mode: "MANUEL",
      });
      await this.auditRepository.save(createdEntry, tx);

      if (clientCertPem !== null && certificateExpiresAt !== null) {
        const certEntry = AuditEntry.create({
          entity: "client",
          entityId: persistedClient.id,
          action: "CERTIFICATE_ISSUED",
          afterData: {
            subjectCN: persistedClient.raisonSociale,
            serialNumber: persistedClient.codeClient,
            expiresAt: certificateExpiresAt.toISOString(),
          },
          userId: actor.id,
          userDisplay: actor.toDisplay(),
          clientId: persistedClient.id,
          clientDisplay,
          mode: "MANUEL",
        });
        await this.auditRepository.save(certEntry, tx);
      }

      // Phase 14 — DETTE-LIC-017 : contacts à création (même tx, attachés à
      // l'entité Siège). Audit CONTACT_CREATED par contact.
      const contactsToCreate = input.contacts ?? [];
      if (contactsToCreate.length > 0) {
        if (this.contactRepository === undefined) {
          throw new InternalError({
            code: "SPX-LIC-900",
            message:
              "contactRepository non câblé : impossible de créer les contacts à création client.",
          });
        }
        for (const c of contactsToCreate) {
          const candidateContact = Contact.create({
            entiteId: siegeEntiteId,
            typeContactCode: c.typeContactCode,
            nom: c.nom,
            ...(c.prenom !== undefined ? { prenom: c.prenom } : {}),
            ...(c.email !== undefined ? { email: c.email } : {}),
            ...(c.telephone !== undefined ? { telephone: c.telephone } : {}),
          });
          const savedContact = await this.contactRepository.save(candidateContact, actorId, tx);
          const contactEntry = AuditEntry.create({
            entity: "contact",
            entityId: savedContact.id,
            action: "CONTACT_CREATED",
            afterData: savedContact.toAuditSnapshot(),
            userId: actor.id,
            userDisplay: actor.toDisplay(),
            clientId: persistedClient.id,
            clientDisplay,
            mode: "MANUEL",
          });
          await this.auditRepository.save(contactEntry, tx);
        }
      }

      return { client: persistedClient, siegeEntiteId };
    });

    return {
      client: toDTO(result.client),
      siegeEntiteId: result.siegeEntiteId,
      clientCertificatePem: clientCertPem,
      certificateExpiresAt,
    };
  }
}
