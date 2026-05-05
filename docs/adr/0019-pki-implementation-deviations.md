# 0019 — Implémentation PKI Phase 3 — précisions et dérogations vs ADR 0002

## Status

Accepted — Mai 2026 (Phase 3 — PKI + sandbox + endpoint public CA).

Cet ADR précise et dérive l'ADR 0002 (PKI S2M : CA auto-signée + certificats clients) en actant les choix d'implémentation techniques de la Phase 3.

## Context

L'ADR 0002 (Avril 2026) a fixé l'architecture PKI : CA auto-signée S2M + certificats X.509 par client + chiffrement clé privée au repos. Phase 3 livre la brique technique. En cours d'implémentation, plusieurs choix concrets ont émergé qui méritent d'être tracés explicitement — soit parce qu'ils dérogent à l'ADR initial, soit parce qu'ils résolvent une ambiguïté laissée ouverte.

## Decisions

### 1. RSA-4096 (et non RSA-2048)

**Décision** : la CA S2M et toutes les paires clients utilisent **RSA-4096**.

**Pourquoi** :

- ADR 0002 ne spécifie pas explicitement la taille de modulus.
- RSA-2048 (NIST SP 800-57 catégorie « 112 bits security strength ») est suffisant jusqu'en ~2030.
- RSA-4096 (« 152 bits security strength ») garde une marge de 10+ ans face aux progrès cryptanalytiques (notamment menace quantique long terme).
- Le coût marginal (keygen 200-500ms vs ~50ms ; signature/vérif quasi inchangées) est acceptable pour des opérations rares (génération CA = 1×, génération client = à la création client).
- Le portail LIC est mono-tenant à faible concurrence (≤200 clients cible) — pas de contrainte perf serveur.

**Conséquence** : le `.lic` v1 généré avec RSA-2048 sur des clients legacy v1 reste vérifiable côté lecteur SELECT-PX (RSA-2048 et RSA-4096 sont compatibles côté algo). Aucune migration cross-version forcée.

### 2. `node:crypto` natif Node 24 — `node-forge` retiré

**Décision** : la stack crypto LIC v2 utilise exclusivement **`node:crypto` natif Node 24** pour RSA, AES, signature, vérification, X.509 read.

**Pourquoi** :

- Avant Node 18, `crypto` natif n'exposait pas `X509Certificate`. `node-forge` était le standard JS pour ASN.1/X.509.
- Depuis Node 18+, `node:crypto.X509Certificate` lit + vérifie + check-issued sync, sans dépendance externe.
- `node:crypto` expose aussi `generateKeyPairSync('rsa')`, `createSign`/`createVerify`, `createCipheriv('aes-256-gcm')` — couverture complète des besoins LIC.
- Réduction de la surface d'attaque : pas d'audit de sécurité tiers à suivre, pas de dépendance à mettre à jour, pas de risque d'un fork malicieux.

**Mise à jour CLAUDE.md** : la règle MUST NOT « utiliser `node-forge` (PKI) + `crypto` natif Node (AES) » (Phase 1) est remplacée par « utiliser `node:crypto` natif Node 24 ». `node-forge` retiré des dépendances Phase 3.A.1.

### 3. `@peculiar/x509` — exception bornée pour la **génération** X.509

**Décision** : la génération de certificats X.509 (CA auto-signée + cert client signé) utilise **`@peculiar/x509` v2** comme dépendance tierce.

**Pourquoi** :

- `node:crypto` ne propose pas de générateur X.509 natif (lecture seulement).
- Implémenter ASN.1/DER en code applicatif = forme de cryptographie custom (violation MUST NOT).
- `@peculiar/x509` est :
  - basé sur Web Crypto API standard (`crypto.subtle`)
  - 0 dépendance C native
  - > 500k téléchargements/semaine npm
  - mainteneur : PeculiarVentures (auteurs de pkijs, webcrypto-liner — référence du milieu PKI JS)
- Tire transitivement `tsyringe` qui requiert `reflect-metadata` (~3 KB polyfill).

**Périmètre de l'exception** : `@peculiar/x509` est utilisé **uniquement** dans `crypto/domain/x509.ts` pour `generateCACert` et `generateClientCert`. Toute autre opération crypto (RSA keygen/sig, AES, lecture X.509, vérification chaîne) reste sur `node:crypto` natif. Si un futur besoin Phase 3.x+ pousse à introduire une autre lib crypto tierce, il faudra un nouvel ADR.

### 4. Algorithme de signature : **RSASSA-PKCS1-v1_5** (et non PSS)

**Décision** : toutes les signatures (paire client, cert X.509) utilisent **RSASSA-PKCS1-v1_5** avec **SHA-256** (RFC 8017 §8.2).

**Pourquoi** :

- ADR 0002 ne spécifie pas le schéma de signature.
- PKCS1-v1_5 est **déterministe** : signer le même payload avec la même clé donne toujours la même signature → permet vecteur de non-régression embarqué dans les tests (`rsa.spec.ts` Phase 3.A.1).
- PSS est **probabiliste** (utilise un seed aléatoire) — plus moderne, mais nécessite un seed externalisé pour test déterministe, surcharge protocole.
- PKCS1-v1_5 est compatible avec le format `.lic` v1 (le lecteur SELECT-PX vérifie déjà avec PKCS1-v1_5) — pas de migration cross-version sur les clients existants.
- PKCS1-v1_5 reste sécurisé pour le cas d'usage LIC (signatures longues durée, pas de timing-attack scenario).

**Note** : si une menace future émerge (e.g. attaque sur l'implémentation PKCS1-v1_5), bascule vers PSS possible — coordination avec lecteur SELECT-PX requise.

### 5. CA auto-signée valide 20 ans, certs clients 10 ans

**Décision** : la CA S2M a `validityYears = 20` par défaut, les certs clients `validityYears = 10`.

**Pourquoi** :

- Pas de mécanisme CRL/OCSP en Phase 3 — la révocation se fait par retrait du cert chez le client (via update du `.lic` non plus signé).
- 20 ans pour la CA = horizon raisonnable pour un produit B2B en évolution lente. Régénération CA = opération destructive (invalide tous les clients) — éviter.
- 10 ans pour les clients = compromis entre rotation manuelle et stabilité opérationnelle. Renouvellement automatique non implémenté Phase 3 (DETTE potentielle Phase 13.x+).
- Aucune injunction réglementaire ne demande des durées plus courtes pour ce type de cert (interne, non navigateur).

### 6. Chiffrement des clés privées : AES-256-GCM avec `APP_MASTER_KEY`

**Décision** : toutes les clés privées RSA (CA + clients) sont chiffrées **AES-256-GCM** avec `APP_MASTER_KEY` (variable d'env, 32 octets base64) avant persistance BD.

**Pourquoi** :

- ADR 0002 acte le principe (« clés privées chiffrées avec une clé maîtresse au repos en BD »).
- AES-256-GCM est l'algorithme de chiffrement authentifié standard (NIST SP 800-38D), 0 dépendance tierce.
- Format de stockage : `iv:tag:ciphertext` base64 (3 segments séparés par `:`) — choisi pour lisibilité dans les logs/diagnostic. Aucun risque de collision base64 ne contient `:`.
- IV de 12 octets aléatoire par chiffrement (NIST SP 800-38D §8.2 recommendation).
- Tag de 128 bits (16 octets, max GCM).
- `APP_MASTER_KEY` doit **NE JAMAIS** être perdue — sans elle, déchiffrement BD impossible. Elle reste en var d'env (pas en BD — sinon œuf-poule).

### 7. Toggle endpoint public CA : setting BD (et non var d'env)

**Décision** : le toggle pour exposer `/.well-known/s2m-ca.pem` est porté par **un setting BD** (`expose_s2m_ca_public`) et **non plus** par la variable d'env `EXPOSE_S2M_CA_PUBLIC`.

**Pourquoi** :

- Avant Phase 3 : var d'env `EXPOSE_S2M_CA_PUBLIC` (lue au démarrage). Modification = redéploiement.
- Phase 3 : toggle SADMIN dynamique côté UI dans `/settings/security` (ou `/settings/general` si déplacé ultérieurement). Modification = action SADMIN qui prend effet immédiatement.
- Cohérent avec le reste des toggles fonctionnels du portail (table `lic_settings` est la single source of truth).
- Suppression de `EXPOSE_S2M_CA_PUBLIC` du schéma Zod env — la var n'est plus consommée.
- Default `false` (404 silencieux) — opt-in explicite par SADMIN.

### 8. Stockage CA dans `lic_settings` (clé `s2m_root_ca`)

**Décision** : la CA (cert + clé privée chiffrée + métadonnées) est persistée comme **un seul enregistrement JSONB** sous la clé `s2m_root_ca` dans `lic_settings`.

**Pourquoi** :

- Un seul UPSERT atomique, pas de problème d'incohérence partielle (cert sans clé privée par exemple).
- `lic_settings.value` est `jsonb` natif Postgres → typesafe runtime + index GIN possibles.
- Pas de table dédiée `lic_pki_authority` — la CA est singleton mono-tenant, table key/value JSONB suffit.
- L'audit `CA_GENERATED` est posé dans `lic_audit_log` (mode MANUEL) dans la même tx que l'UPSERT settings (règle L3).

### 9. Code SCRIPT pour audit_mode (Phase 3.E.0)

**Décision** : ajout de la valeur `SCRIPT` à l'enum `audit_mode` (migration 0011 — ALTER TYPE).

**Pourquoi** :

- Le backfill (`pnpm script:backfill-client-certs` Phase 3.E) émet des entrées `CERTIFICATE_ISSUED` pour les clients pré-Phase-3 sans cert.
- Les valeurs existantes `MANUEL` (utilisateur authentifié), `JOB` (pg-boss), `SEED` (db:seed) ne reflètent pas la sémantique « script CLI manuel exécuté par admin ».
- `SCRIPT` distingue dans le journal d'audit les opérations imperatives one-shot des actions UI (MANUEL) et des jobs récurrents (JOB).

## Consequences

**Bonnes**

- Surface crypto réduite à `node:crypto` + `@peculiar/x509` (génération X.509 only). Audit de sécurité simple.
- RSA-4096 + PKCS1-v1_5 + SHA-256 = standards mainstream, vérifiables avec n'importe quel parser X.509 RFC 5280.
- Toggle CA public déplacé en BD = pas de redéploiement pour ouvrir/fermer l'endpoint.
- Backfill avec audit `SCRIPT` = traçabilité claire des certs émis post-mortem aux clients pré-Phase-3.

**Mauvaises**

- Dépendance tierce `@peculiar/x509` ajoutée — à surveiller vis-à-vis des releases sécurité (pas pinned strict, version `^2.0.0`).
- `APP_MASTER_KEY` reste en var d'env — perte = déchiffrement BD impossible. Backup procedural à formaliser hors LIC v2.
- Régénération CA non implémentée (opération destructive). DETTE potentielle Phase 13.x+.
- Pas de CRL/OCSP — la révocation cert client se fait par retrait du `.lic` côté client.

**Neutres**

- ADR 0002 reste en place (architecture). ADR 0019 = précisions et dérogations vocabulaire/algo.
- `EXPOSE_S2M_CA_PUBLIC` env var supprimée. Migration : aucune (var par défaut `false`, comportement identique à BD setting absent → 404).

### 10. Phase 14 — PKI bouclage `.lic` + healthcheck AES (DETTE-LIC-008 résolue)

**Décision** : la génération `.lic` et l'import healthcheck quittent leur état stub Phase 10 et activent les chemins crypto réels.

**`.lic` — signature RSA + cert client embarqué** :

- `GenerateLicenceFichierUseCase` accepte un nouveau paramètre `options?: { appMasterKey: string }`. Quand fourni (Server Action prod), le use-case :
  1. Lit les colonnes `client_private_key_enc`, `client_certificate_pem`, `client_certificate_expires_at` via `clientRepository.findClientCredentials(clientId)`. Throw `SPX-LIC-411` si une des 3 est null (cas client legacy non backfillé).
  2. Déchiffre la clé privée client avec `decryptAes256Gcm(privateKeyEnc, appMasterKey)` (AES-256-GCM, ADR-0019 §6).
  3. Signe le `contentJson` avec `signPayload()` — RSASSA-PKCS1-v1_5 + SHA-256 (ADR-0019 §4).
  4. Concatène le payload final selon ADR-0002 :
     ```
     <contentJson>
     --- SIGNATURE S2M ---
     <signatureBase64>
     --- CERTIFICATE S2M ---
     <client_certificate_pem>
     ```
  5. Calcule le hash SHA-256 sur le **payload complet signé** (anti-altération end-to-end, pas seulement contenu JSON).

- Mode legacy conservé (rétrocompat tests d'intégration sans PKI) : si `options` absent, retombe sur le chemin stub Phase 10 (JSON brut, pas de signature). Server Action prod injecte toujours `appMasterKey`.

**`.hc` healthcheck — chiffrement AES-256-GCM symétrique** :

- `ImportHealthcheckUseCase` accepte un nouveau paramètre constructor `settingRepository?: SettingRepository`. Quand câblé (composition-root prod) :
  1. Lit la clé partagée depuis `lic_settings.healthcheck_shared_aes_key`. Throw `SPX-LIC-411` si absente (configuration manquante).
  2. `decryptAes256Gcm(uploadedContent, sharedKey)` → plaintext. Throw `SPX-LIC-402` si tag mismatch (contenu altéré OU clé partagée incorrecte côté banque/S2M).
  3. Parse le plaintext déchiffré (JSON ou CSV — comportement Phase 10 inchangé).

- Mode legacy conservé : tests sans `settingRepository` injecté passent en passe-plat (parse direct).

- Seed bootstrap (`seed.ts`) génère `healthcheck_shared_aes_key` via `generateAes256Key()` lors du premier `pnpm db:seed`. Idempotent (`ON CONFLICT DO NOTHING`). La rotation de clé reste manuelle SADMIN.

**Asymétrie justifiée** :

- `.lic` = S2M → F2 : authentification S2M obligatoire (signature RSA), cert client distribué embarqué pour vérification autonome F2.
- `.hc` = F2 → S2M : confidentialité volumes consommés (AES-GCM partagé). Pas d'asymétrie utile — l'authentification du flux F2 → S2M est portée par la session UI ADMIN/SADMIN qui upload.

**Tests** :

- `generate-licence-fichier-pki.int.spec.ts` : 3 tests — signature vérifiable via clé publique, format ADR-0002 conforme, throw 411 sans cert.
- `import-healthcheck-aes.int.spec.ts` : 3 tests — round-trip encrypt/decrypt, tag mismatch (contenu altéré), clé partagée absente.

**Conséquence rétrocompat** : aucune migration BD requise — les colonnes PKI Phase 3.B sont déjà en place. Les `.lic` v1 (legacy non signés) restent générables si la Server Action n'injecte pas `appMasterKey` (cas test uniquement).

## Références

- ADR 0002 — PKI S2M : CA auto-signée + certificats clients
- ADR 0009 — Variante B Next.js full-stack
- `app/src/server/modules/crypto/` — implémentation Phase 3.A
- `app/src/server/modules/fichier-log/application/generate-licence-fichier.usecase.ts` — Phase 14
- `app/src/server/modules/fichier-log/application/import-healthcheck.usecase.ts` — Phase 14
- `migration 0010` — colonnes PKI sur `lic_clients` (Phase 3.B)
- `migration 0011` — ALTER TYPE audit_mode ADD VALUE SCRIPT (Phase 3.E.0)
- RFC 8017 §8.2 — RSASSA-PKCS1-v1_5
- NIST SP 800-38D — AES-GCM
- RFC 5280 — X.509
