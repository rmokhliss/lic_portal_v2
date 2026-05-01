# 0002 — PKI S2M : CA auto-signée + certificats clients

## Status
Accepted — Avril 2026

## Context

Pour authentifier cryptographiquement les fichiers de licence (`.lic`) livrés à F2 (le supervisor logiciel S2M déployé chez le client), il faut un mécanisme de signature/vérification fiable.

Trois options évaluées :

1. **Une seule paire RSA S2M** (signature de toutes les licences avec la même clé privée). Simple. Mais en cas de fuite de la clé privée S2M, on doit regénérer toutes les vérifications côté F2.

2. **CA commerciale** (DigiCert, Sectigo) émettant des certificats clients individuels. Le plus robuste. Mais coût récurrent significatif et procédure d'émission manuelle pour chaque nouveau client. Sur-dimensionné pour le besoin (les F2 sont des clients identifiés contractuellement).

3. **CA interne S2M auto-signée** émettant des certificats clients. Le portail héberge la CA, génère une paire RSA + un certificat X.509 pour chaque nouveau client. Coût zéro, autonomie totale, possibilité de migrer vers une CA commerciale plus tard sans casser le code.

Pour le healthcheck (fichier remontant les volumes consommés depuis F2 vers LIC), pas besoin d'authentification asymétrique : les volumes ne sont pas sensibles au point de nécessiter une PKI complète. Un chiffrement symétrique AES-256-GCM avec clé partagée suffit pour éviter d'exposer les chiffres en clair sur le réseau.

## Decision

**Option 3** : LIC v2 héberge une **CA interne S2M auto-signée**, et chaque client a son propre certificat X.509 signé par la CA.

**Architecture finale** :

| Niveau | Quoi | Détenteur(s) | Stockage S2M | Usage |
|---|---|---|---|---|
| Root S2M | Clé privée CA | S2M uniquement | `lic_settings.s2m_root_private_key_pem` chiffré AES-GCM avec `app_master_key` (env var) | Signe les certificats clients |
| Root S2M | Certificat CA auto-signé (contient clé publique CA) | S2M + **tous les F2** (un seul fichier identique partout, distribué) | `lic_settings.s2m_root_certificate_pem` en clair | F2 vérifie les certificats clients |
| Par client | Clé privée du client | S2M uniquement (jamais transmise) | `lic_clients.client_private_key_pem` chiffré AES-GCM avec `app_master_key` | Signe les `.lic` de ce client |
| Par client | Certificat X.509 du client | S2M + F2 du client (transmis embarqué dans le `.lic`) | `lic_clients.client_certificate_pem` en clair | F2 vérifie la signature du payload (après avoir validé le certificat avec la clé publique CA) |

**Format `.lic`** : JSON en clair (lisible par F2 pour debug/parsing) + séparateur `--- SIGNATURE S2M ---` + signature base64 + bloc PEM du certificat client.

**Healthcheck `.hc`** : chiffrement AES-256-GCM symétrique avec clé partagée stockée dans `lic_settings.healthcheck_shared_aes_key`. Pas d'asymétrie pour ce flux.

**Bibliothèque** : `node-forge` pour génération des paires RSA-2048, génération des certificats X.509, signature/vérification. `crypto` natif Node pour AES-GCM.

**Workflow génération certif client** :
1. À la création d'un client : génération paire RSA + génération certificat X.509 signé par la CA, dans la **même transaction** que l'INSERT `lic_clients`
2. Audit log `entity='client', action='CERTIFICATE_ISSUED'`
3. Validité par défaut : **10 ans** (configurable dans `/settings/security`)

**Distribution clé publique CA** :
- Téléchargement manuel par SADMIN depuis `/settings/security`
- Endpoint public optionnel `/.well-known/s2m-ca.pem` (toggle ON/OFF dans `/settings/general`) — F2 peut récupérer automatiquement

**Bootstrap** : action SADMIN dans `/settings/sandbox` pour générer la paire CA initiale (ou regénérer en cas de besoin, avec avertissement explicite "Cela invalide tous les certifs clients existants").

## Consequences

**Bonnes**
- F2 a **un seul artefact partagé** à connaître : la clé publique CA (`s2m-ca.pem`) — un seul fichier identique pour tous les F2
- Si une clé privée client fuit, on **révoque ce client** seulement (régénération paire + certif)
- Aucun coût récurrent (vs CA commerciale)
- Migration vers CA commerciale possible plus tard : on remplace juste le couple racine, le reste du code (génération certifs, signature, vérif F2) est identique
- F2 peut parser le JSON du `.lic` directement (en clair), utile pour debug et logs

**Mauvaises**
- Si la **clé privée CA** fuit, régénération complète et redistribution de la clé publique CA à tous les F2 (procédure exceptionnelle, mais à documenter)
- Une paire RSA-2048 par client occupe ~3 Ko en BD — négligeable pour <1000 clients
- Génération paire RSA-2048 = ~50-200 ms à la création d'un client. Acceptable car action rare.

**Neutres**
- Le healthcheck reste en AES symétrique : si la clé partagée fuit, mise à jour coordonnée S2M ↔ tous les F2. Procédure documentée dans `docs/integration/F2_FORMATS.md`.
- Les F2 n'ont **rien à faire** en cas de rotation des clés clients : ils reçoivent simplement un nouveau `.lic` avec un nouveau certificat embarqué.
- Sandbox SADMIN (`/settings/sandbox`) permet de tester end-to-end (génération + vérif + chiffrement HC + déchiffrement) sans rien écrire en BD ni audit log (cf. règle L16).
