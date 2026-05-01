# LIC_PORTAL — Modèle de données (PostgreSQL 16 + TypeScript)

Document de référence sur le modèle de données. **Cible native PostgreSQL + Drizzle ORM**.

**Version** : 2.0 — Avril 2026
**Destinataires** : équipe SPX UI S2M — développeurs Next.js + TypeScript

---

## Vue d'ensemble

Le schéma LIC_PORTAL est organisé autour d'une hiérarchie Client → Entité → Licence :

```
CLIENTS ──┬── ENTITES ──┬── LICENCES ──┬── PRODUITS  (lic_licence_produits — DEC-014)
          │             │              ├── ARTICLES + volumes (lic_licence_articles — DEC-014)
          │             │              │     └── ARTICLE_VOLUME_HISTORY (snapshots mensuels)
          │             │              └── RENOUVELLEMENTS
          ├── ALERT_CONFIGS (règles d'alerte par client)
          ├── NOTIFICATIONS (messages in-app)
          └── AUDIT_LOG (journal des modifications + traces fichiers DEC-010)

Catalogue commercial (DEC-013) :
  PRODUITS_REF ── ARTICLES_REF

Référentiels paramétrables SADMIN (DEC-012) :
  REGIONS_REF ──┬── PAYS_REF
                └── TEAM_MEMBERS
  DEVISES_REF, LANGUES_REF, TYPES_CONTACT_REF

Tables techniques :
  USERS (comptes BO)
  SETTINGS (paramétrage SADMIN)
  BATCH_JOBS ── BATCH_EXECUTIONS ── BATCH_LOGS
  VOLUME_HISTORY (snapshots mensuels — DEC-005, ancien modèle, à supprimer Lot A4)
```

Total : **25 tables** (Sprint 10 — Lot 13, DEC-022 : 11 métier
+ 6 référentiels paramétrables + 2 catalogue commercial + 3 liaison
licence-catalogue + 1 settings + 2 Lot 11 contacts/fichiers — DEC-019).
Les fichiers de licence générés et les healthchecks importés sont tracés
dans `lic_fichiers_log` (Sprint 10 — Lot 11, DEC-019). L'audit log
`lic_audit_log` reste écrit en parallèle pour la cohérence du journal des
modifications mais n'est plus la source primaire (cf. DEC-019).

Les 6 référentiels paramétrables (régions, pays, devises, langues, types contacts, équipes)
introduits sprint 10 (DEC-012) sont éditables par SADMIN via `/settings` (Lot C).

Le catalogue commercial Produit → Article (sprint 10, DEC-013) et ses tables
de liaison `lic_licence_produits` / `lic_licence_articles` /
`lic_article_volume_history` (sprint 10, DEC-014) constituent désormais le
modèle exclusif. Sprint 10 — Lot 13 (DEC-022) : l'ancien modèle modules/
volumes a été supprimé, la transition est terminée.

---

## Conventions de nommage

| Type | Convention | Exemple |
|---|---|---|
| Table Postgres | `lic_*` en snake_case | `lic_licences` |
| Colonne Postgres | snake_case | `date_fin`, `vol_consomme` |
| Export Drizzle | camelCase | `licences`, `dateFin`, `entites` |
| Type TypeScript | PascalCase | `Licence`, `LicenceStatus`, `Entite` |
| Primary key | `id` (serial) | `id` |
| Foreign key | `<entity>_id` | `licence_id`, `client_id`, `entite_id` |
| Booléen | préfixe `is_` ou nom explicite | `actif`, `is_read` |
| Enum Postgres | nom singulier + `_enum` | `licence_status_enum` |

---

## Types PostgreSQL utilisés

| Type PG | Usage | Équivalent TS |
|---|---|---|
| `serial` | Clé primaire auto-incrémentée | `number` |
| `integer` | Nombre entier | `number` |
| `numeric(p,s)` | Nombre décimal précis | `string` en Drizzle |
| `varchar(n)` | Chaîne plafonnée | `string` |
| `text` | Chaîne libre | `string` |
| `boolean` | Oui/Non | `boolean` |
| `timestamp` | Date + heure | `Date` |
| `date` | Date sans heure | `Date` |
| `jsonb` | JSON indexable | `Record<string, unknown>` |
| `tsvector` (généré) | Full-text search | — |

**Enums Postgres** :

```sql
CREATE TYPE licence_status_enum AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU', 'EXPIRE');
CREATE TYPE user_role_enum AS ENUM ('SADMIN', 'ADMIN', 'USER');
CREATE TYPE alert_channel_enum AS ENUM ('BACKOFFICE', 'EMAIL', 'EMAIL_BO');
CREATE TYPE audit_mode_enum AS ENUM ('MANUEL', 'API', 'JOB');
CREATE TYPE batch_status_enum AS ENUM ('EN_COURS', 'SUCCES', 'PARTIEL', 'ERREUR', 'ANNULE');
CREATE TYPE batch_declencheur_enum AS ENUM ('SCHEDULER', 'MANUEL', 'API');
CREATE TYPE log_level_enum AS ENUM ('INFO', 'WARN', 'ERROR', 'DEBUG');
CREATE TYPE notif_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE licence_calc_status_enum AS ENUM ('ACTIF', 'ALERTE', 'EXPIRE', 'INACTIF', 'SUSPENDU');
CREATE TYPE client_statut_enum AS ENUM ('PROSPECT', 'ACTIF', 'SUSPENDU', 'RESILIE');
CREATE TYPE renew_status_enum AS ENUM ('EN_COURS', 'VALIDE', 'CREE', 'ANNULE');
```

---

## Tables référentielles paramétrables (DEC-012)

Introduites sprint 10 (Lot A1, **DEC-012**). Ces tables servent de catalogue de
valeurs pour les écrans clients/licences (lookup direct) et seront éditables
via l'écran `/settings` (SADMIN) à partir du Lot C.

### lic_regions_ref — Régions commerciales

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `region_code` | varchar(50) | UNIQUE, NOT NULL | Identifiant logique (ex: NORD_AFRIQUE) |
| `nom` | varchar(100) | NOT NULL | Libellé affiché |
| `dm_responsable` | varchar(100) | — | Nom du Directeur Métier référent |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |

### lic_pays_ref — Pays clients

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `code_pays` | varchar(2) | UNIQUE, NOT NULL | ISO 3166-1 alpha-2 |
| `nom` | varchar(100) | NOT NULL | Libellé affiché |
| `region_code` | varchar(50) | FK → lic_regions_ref(region_code) | Région commerciale rattachée |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |

### lic_devises_ref — Devises de facturation

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `code_devise` | varchar(10) | UNIQUE, NOT NULL | ISO 4217 (3 lettres) ou variantes legacy |
| `nom` | varchar(100) | NOT NULL | Libellé affiché |
| `symbole` | varchar(10) | — | Symbole monétaire (DH, $, €, …) |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |

### lic_langues_ref — Langues supportées

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `code_langue` | varchar(5) | UNIQUE, NOT NULL | Code ISO court (fr, en, ar, …) |
| `nom` | varchar(100) | NOT NULL | Libellé affiché |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |

### lic_types_contact_ref — Types de contacts client

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `code` | varchar(30) | UNIQUE, NOT NULL | Identifiant logique (ACHAT, FACTURATION, …) |
| `libelle` | varchar(100) | NOT NULL | Libellé affiché |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |

### lic_team_members — Équipes commerciales S2M

Référence des collaborateurs Sales / Account Managers / Directeurs Métier.
Préparation du remplacement des champs libres `sales_responsable` / `account_manager`
de `lic_clients` (lot ultérieur).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `nom` | varchar(100) | NOT NULL | |
| `prenom` | varchar(100) | — | |
| `email` | varchar(200) | — | |
| `telephone` | varchar(20) | — | |
| `role_team` | varchar(20) | NOT NULL, CHECK IN ('SALES','AM','DM') | |
| `region_code` | varchar(50) | FK → lic_regions_ref(region_code) | Renseigné pour les DM |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |

---

## Paramétrage SADMIN

Les 6 tables référentielles ci-dessus sont éditables par les utilisateurs
SADMIN via l'écran `/settings` à partir du **Lot C** (sprint 10). Tant que
l'écran n'existe pas, les données sont seedées et lues directement par les
écrans clients/licences (lookup en lecture seule).

Cette approche (vs valeurs hardcodées) permet :
- L'ajout de nouveaux pays / devises sans redéploiement (expansion géographique)
- La gestion RH des équipes commerciales (mouvements internes, départs/arrivées)
- L'activation/désactivation propre via le drapeau `actif` sans casser l'historique

---

## Catalogue commercial SELECT-PX

Introduit sprint 10 (Lot A2, **DEC-013**). Modèle hiérarchique à 2 niveaux qui
reflète la structure réelle de vente SELECT-PX :

```
PRODUIT (ex: SelectPX Acquiring Suite)
  └── ARTICLE (ex: ATM Management standard, POS Server, Merchant Portal, …)
        ├── a_volume = true  → comporte un volume contractuel (unite_label)
        └── a_volume = false → simple présence/activation
```

Les codes article sont **dupliqués** entre les versions SPX et SSV6
(`ATM_STD_SPX` vs `ATM_STD_V6`) car les volumes peuvent différer entre les
deux versions chez un même client.

### lic_produits_ref — Produits commerciaux

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `produit_code` | varchar(50) | UNIQUE, NOT NULL | Identifiant logique (SPX_ACQUIRING, …) |
| `libelle` | varchar(200) | NOT NULL | Libellé commercial affiché |
| `description` | varchar(500) | — | Texte explicatif |
| `ordre_affichage` | integer | NOT NULL, DEFAULT 99 | Tri dans le wizard |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |

### lic_articles_ref — Articles d'un produit

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `article_code` | varchar(50) | UNIQUE, NOT NULL | Identifiant logique |
| `produit_code` | varchar(50) | NOT NULL, FK → lic_produits_ref(produit_code) | Produit parent |
| `libelle` | varchar(200) | NOT NULL | Libellé commercial affiché |
| `description` | varchar(500) | — | Texte explicatif |
| `a_volume` | boolean | NOT NULL, DEFAULT FALSE | TRUE si l'article a un volume contractuel |
| `unite_label` | varchar(100) | — | Libellé d'unité (ex: "Nombre de GAB") — requis si `a_volume=true` |
| `ordre_affichage` | integer | NOT NULL, DEFAULT 99 | Tri dans le wizard |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |

**Index** : `idx_articles_produit (produit_code)`

**Évolution prévue** :
- **Lot A3** ✅ : tables de liaison `lic_licence_produits` / `lic_licence_articles`
  / `lic_article_volume_history` livrées (sprint 10 — voir section suivante).
- **Lot 13** ✅ (DEC-022) : suppression définitive des anciennes tables
  `lic_modules` / `lic_volumes` / `lic_volume_history` / `lic_modules_ref` /
  `lic_unites_ref` / `lic_interfaces_ref` + colonne `module_code` de
  `lic_alert_config`.

---

## Tables de liaison licence-catalogue

Introduites sprint 10 (Lot A3, **DEC-014**). Font le pont entre les licences
existantes et le catalogue commercial (DEC-013). Coexistent avec l'ancien
modèle modules/volumes jusqu'au Lot A4.

### lic_licence_produits — Produits inclus dans une licence

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `licence_id` | integer | NOT NULL, FK → lic_licences ON DELETE CASCADE | |
| `produit_code` | varchar(50) | NOT NULL, FK → lic_produits_ref(produit_code) | |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | Désactivable sans suppression |
| `date_activation` | timestamp | — | Première mise en service |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| UNIQUE | (licence_id, produit_code) | — | Un produit n'est listé qu'une fois |

**Index** : `idx_licence_produits_licence (licence_id)`

### lic_licence_articles — Articles d'une licence avec leurs volumes

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `licence_id` | integer | NOT NULL, FK → lic_licences ON DELETE CASCADE | |
| `article_code` | varchar(50) | NOT NULL, FK → lic_articles_ref(article_code) | |
| `produit_code` | varchar(50) | NOT NULL | Dénormalisé pour filtrage rapide |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `vol_contractuel` | numeric(12,0) | CK > 0 ou NULL | NULL pour articles sans volume |
| `vol_consomme` | numeric(12,0) | NOT NULL, DEFAULT 0, CK ≥ 0 | Mis à jour par healthcheck (DEC-008) |
| `seuil_alerte_pct` | numeric(5,2) | NOT NULL, DEFAULT 80, CK 1-100 | |
| `date_modif` | timestamp | — | |
| UNIQUE | (licence_id, article_code) | — | |

**Index** : `idx_licence_articles_licence (licence_id)`,
`idx_licence_articles_article (article_code)`

**Statut calculé dynamiquement** :
- `OK` : `vol_consomme / vol_contractuel * 100 < seuil_alerte_pct`
- `ALERTE` : `>= seuil_alerte_pct` et `< 100`
- `DEPASSE` : `>= 100`
- `N/A` : `vol_contractuel IS NULL` (article sans volume)

### lic_article_volume_history — Snapshots mensuels nouvelle structure

Snapshots mensuels des volumes par article (DEC-014). Alimenté par le job
`snapshot-volumes` (cron `0 1 1 * *`, Lot D5).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `licence_article_id` | integer | NOT NULL, FK → lic_licence_articles ON DELETE CASCADE | |
| `periode` | date | NOT NULL | 1er du mois |
| `vol_consomme_debut` | numeric(12,0) | NOT NULL | |
| `vol_consomme_fin` | numeric(12,0) | NOT NULL | |
| `delta` | numeric(12,0) | NOT NULL | Consommation du mois |
| `vol_contractuel` | numeric(12,0) | — | Snapshot (nullable comme dans `lic_licence_articles`) |
| `created_at` | timestamp | NOT NULL, DEFAULT NOW() | |
| UNIQUE | (licence_article_id, periode) | — | |

**Index** : `idx_art_vol_hist_art_per (licence_article_id, periode DESC)`,
`idx_art_vol_hist_periode (periode DESC)`

---

## Modèle métier unique (Sprint 10 — Lot 13, DEC-022)

Le modèle de référence est exclusivement le catalogue commercial :

| Concerne | Tables |
|---|---|
| Catalogue commercial | `lic_produits_ref`, `lic_articles_ref` |
| Activations par licence | `lic_licence_produits`, `lic_licence_articles` |
| Volumes contractuels | `lic_licence_articles.vol_contractuel` |
| Snapshots mensuels | `lic_article_volume_history` |

L'ancien modèle (`lic_modules`, `lic_volumes`, `lic_volume_history`,
`lic_modules_ref`, `lic_unites_ref`, `lic_interfaces_ref`) a été
définitivement supprimé au Lot 13 (migration `0015_lot13_drop_old_tables.sql`).
Les anciennes entrées d'audit log avec `entity='module'` ou `entity='volume'`
restent valides en BD pour la traçabilité, mais aucune nouvelle entrée de
ce type n'est créée par le code applicatif.

---

## Données de démonstration v2 (Lot A5, DEC-016)

Refonte complète du jeu de démo. Volumétrie après `pnpm db:reset` :

| Domaine | Table | Lignes |
|---|---|---:|
| Catalogues paramétrables | `lic_regions_ref` | 7 |
| | `lic_pays_ref` | 23 |
| | `lic_devises_ref` | 18 |
| | `lic_langues_ref` | 4 |
| | `lic_types_contact_ref` | 5 |
| | `lic_team_members` | 18 |
| Catalogue commercial | `lic_produits_ref` | 19 |
| | `lic_articles_ref` | 89 (30 avec volume + 59 sans) |
| Comptes BO | `lic_users` | 5 |
| Banques clientes | `lic_clients` | **55** (8 régions, 23 pays) |
| Entités | `lic_entites` | 55 (1 « Siège » par client) |
| Licences démo | `lic_licences` | 6 (5 démo + 1 cible renouvellement BIAT) |
| Produits par licence | `lic_licence_produits` | 12 |
| Articles par licence | `lic_licence_articles` | 27 (15 avec volume + 12 sans) |
| Snapshots historiques | `lic_article_volume_history` | 48 (8 articles × 6 mois) |
| Renouvellements | `lic_renouvellement` | 3 (EN_COURS / VALIDE / CREE sur BIAT) |
| Règles d'alerte | `lic_alert_config` | 3 |
| Notifications | `lic_notifications` | 3 |
| Audit log | `lic_audit_log` | 5 |
| Batchs | `lic_batch_executions` | 2 (1 succès + 1 erreur) |
| | `lic_batch_logs` | 1 |

Les 5 licences démo couvrent les principaux scénarios :

| Référence | Client | Produits | Démontre |
|---|---|---|---|
| LIC-2025-001 | Crédit du Maroc | SPX Acquiring + Issuing + Core | Cas nominal multi-produits |
| LIC-2025-002 | Attijari TN | SPX Acquiring + Core | Articles en ALERTE (90%) et DÉPASSÉ (104%) |
| LIC-2025-003 | BMCI | SSV6 Issuing + Core | Version SSV6 |
| LIC-2025-004 | BIAT | Wallet + Digital Hub + Instant Client | Produits hub/wallet (3 dossiers de renouvellement) |
| LIC-2026-001 | BNI Côte d'Ivoire | SoftPOS + POS App | Cas mobile/SoftPOS |

Les snapshots historiques sur LIC-2025-001 et LIC-2025-002 (8 articles
avec volume × 6 mois) permettent de tester `computeTrend` et
`computeProjection` (DEC-004) — la croissance simulée garantit
`trend = UP` pour tous les articles.

---

## Services et règles métier nouveaux articles

Sprint 10 — Lot B (DEC-014, DEC-015). Trois domaines de services nouveaux
+ adaptation des services licence existants pour accepter les deux modèles.

### Pure functions (calculs)

- **`calculateStatus(article)`** — `OK` / `ALERT` / `EXCEEDED` / `NA`
  - `NA` quand `vol_contractuel IS NULL` (article sans volume) ou ≤ 0
  - `EXCEEDED` si `pct ≥ 100`
  - `ALERT` si `pct ≥ seuil_alerte_pct` et `< 100`
  - `OK` sinon
- **`calculatePctUsage(article)`** — `(consomme / contractuel) * 100`,
  `null` si pas de volume
- **`computeArticleTrend(history)`** — proxy de `computeTrend` (DEC-004) :
  signature structurelle `{ delta }[]` adaptée à `lic_article_volume_history`
  - `< 3 mois` → `CALIBRATING`
  - `[3, 6[ mois` → `UP` si `avgLast3 > 0`, sinon `FLAT`
  - `≥ 6 mois` → comparaison avgLast3 vs avg(mois -4..-6) avec seuils ±5%
- **`computeArticleProjection(params)`** — projection de dépassement
  - `vol_contractuel = null` → `ok` (pas de notion de dépassement)
  - `volConsomme >= volContractuel` → `exceeded`
  - `trend = CALIBRATING` → `calibrating`
  - sinon : si `dateProjetee < licenceDateFin` → `warning`, sinon `ok`

### Services métier

| Service | Permissions | Usage |
|---|---|---|
| `produitService.list/get` | tous rôles (lecture) | Catalogue commercial |
| `produitService.create/update/toggleActif` | **SADMIN** uniquement | Édition catalogue |
| `articleService.list/get/listByProduit` | tous rôles | Catalogue commercial |
| `articleService.create/update/toggleActif` | **SADMIN** uniquement | Édition catalogue |
| `licenceProduitService.listForLicence` | tous rôles | Affichage produits d'une licence |
| `licenceProduitService.add/remove/toggleActif` | ADMIN+ | Mutation liaison |
| `licenceArticleService.listForLicence/listByProduit` | tous rôles | Affichage articles |
| `licenceArticleService.add/update/remove` | ADMIN+ | Mutation liaison |
| `licenceArticleService.updateVolConsomme` | ADMIN+ | F-011 nouvelle structure |
| `licenceArticleService.getHistory` | tous rôles | Historique mensuel article |

Toute mutation est tracée dans `lic_audit_log` avec `entity` parmi
`produit`, `article`, `licence_produit`, `licence_article` (extension de
`AuditEntity` faite au Lot B).

### Job snapshot adapté

Le job `snapshot-volumes` (cron `0 1 1 * *`) snapshot désormais **les deux
modèles** dans le même run :
`lic_licence_articles` → `lic_article_volume_history` (Sprint 10 — Lot D5 :
la branche legacy `lic_volume_history` a été retirée ; Lot 13 / DEC-022 :
les anciennes tables ont été supprimées).

Les compteurs sont distincts dans les logs batch (`processedLegacy` /
`processedArticles`). Pas de changement de fréquence cron.

### Adaptation des services licence existants

`licenceService.getDetails` retourne désormais `produits` et `articles`
en plus de `modules` et `volumes` (ces deux derniers marqués `@deprecated Lot A4`).
`licenceService.create` accepte les 4 collections en input — chacune est
indépendante et insérée si non vide. `licenceService.duplicate` copie
également les liaisons `licence_produits` / `licence_articles` (avec
`actif = false` et `volConsomme = "0"` comme pour l'ancien modèle).

---

## Tables métier

### lic_clients — Groupes bancaires et institutions

Un client peut être un groupe bancaire (ex: Attijariwafa Group), une banque standalone,
ou toute institution financière. Il peut avoir plusieurs entités/filiales.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `code_client` | varchar(20) | UNIQUE, NOT NULL | Code court (BAM, ATW, CIH) |
| `raison_sociale` | varchar(200) | NOT NULL | Nom légal |
| `nom_contact` | varchar(100) | — | Contact commercial |
| `email_contact` | varchar(200) | — | Email contact |
| `tel_contact` | varchar(20) | — | Téléphone |
| `pays` | varchar(2) | — | Code pays ISO |
| `region` | varchar(100) | — | Région (Afrique du Nord, Afrique de l'Ouest…) |
| `langue` | varchar(10) | DEFAULT 'fr' | Langue principale (fr/en) |
| `devise` | varchar(10) | — | Devise principale (MAD, XOF…) |
| `sales_responsable` | varchar(100) | — | Nom du Sales S2M responsable |
| `account_manager` | varchar(100) | — | Nom de l'Account Manager S2M |
| `statut_client` | client_statut_enum | NOT NULL, DEFAULT 'ACTIF' | PROSPECT/ACTIF/SUSPENDU/RESILIE |
| `date_signature_contrat` | date | — | Date signature contrat cadre |
| `date_mise_en_prod` | date | — | Date mise en production |
| `date_demarrage_support` | date | — | Date début support (après fin garantie) |
| `prochaine_date_renouvellement_support` | date | — | Prochaine échéance support |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | FALSE = compte désactivé |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | Matricule créateur |
| `date_modif` | timestamp | — | |
| `modifie_par` | varchar(50) | — | |

**Index** : `idx_clients_code (UNIQUE)`, `idx_clients_actif`, `idx_clients_raison_sociale`,
`idx_clients_search GIN (raison_sociale gin_trgm_ops)`

### lic_entites — Filiales et sous-entités

Niveau intermédiaire entre le client et la licence.
Une entité est une filiale géographique, une sous-banque, ou un périmètre produit distinct.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `client_id` | integer | NOT NULL, FK → lic_clients | Client parent |
| `nom` | varchar(200) | NOT NULL | Nom de l'entité |
| `pays` | varchar(2) | — | Pays de l'entité (si différent du client) |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| `date_modif` | timestamp | — | |
| `modifie_par` | varchar(50) | — | |
| UNIQUE | (client_id, nom) | — | Pas de doublon par client |

**Index** : `idx_entites_client`, `idx_entites_actif`

**Règles métier** :
- Une entité appartient à un seul client
- Une entité peut avoir plusieurs licences (par produit ou par période)
- Soft delete uniquement (`actif = false`)

### lic_licences — Contrats de licences

Une licence = un contrat entre S2M et une entité bancaire, avec durée et modules autorisés.

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `client_id` | integer | NOT NULL, FK → lic_clients | Dénormalisé pour filtrage rapide |
| `entite_id` | integer | NOT NULL, FK → lic_entites | Entité propriétaire |
| `reference` | varchar(30) | UNIQUE, NOT NULL | Format LIC-AAAA-NNN |
| `date_debut` | timestamp | NOT NULL | |
| `date_fin` | timestamp | NOT NULL, CK > date_debut | |
| `status` | licence_status_enum | NOT NULL, DEFAULT 'ACTIF' | |
| `commentaire` | text | — | Notes internes |
| `version` | integer | NOT NULL, DEFAULT 1, CK ≥ 1 | Optimistic locking |
| `renouvellement_auto` | boolean | NOT NULL, DEFAULT FALSE | Déclenche renouvellement J-60 |
| `notif_envoyee` | boolean | NOT NULL, DEFAULT FALSE | Notification J-30 déjà envoyée |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| `date_modif` | timestamp | — | |
| `modifie_par` | varchar(50) | — | |
| CHECK | date_fin > date_debut | — | |

**Avertissement à la création** : si l'entité a déjà une licence ACTIVE avec chevauchement
de dates, le service affiche un warning et demande confirmation avant insertion.

**Index** : `idx_licences_client`, `idx_licences_entite`, `idx_licences_status`,
`idx_licences_date_fin`, `idx_licences_reference`, `idx_licences_date_creation`

> **Note Lot 13 (DEC-022)** : les tables `lic_modules`, `lic_volumes`,
> `lic_volume_history` ont été supprimées. Le modèle de référence est
> désormais exclusivement `lic_licence_produits` / `lic_licence_articles`
> / `lic_article_volume_history` (voir section "Tables de liaison
> licence-catalogue" plus haut).

### Fichiers de licence et healthchecks — traçabilité (DEC-010 → DEC-019)

Le concept de **clé d'activation** a été supprimé : le fichier de licence chiffré
(DEC-007) constitue désormais la seule livraison à F2, et il est généré à la
demande, sans stockage.

Sprint 10 — Lot 11 (DEC-019) introduit la table dédiée `lic_fichiers_log` qui
remplace la lecture brute de `lic_audit_log` pour EC-03a onglet "Fichiers" et
alimente le nouvel écran `/files`. L'audit log continue d'être écrit pour
préserver la cohérence du journal des modifications, mais la source de vérité
métier des fichiers est désormais `lic_fichiers_log`.

### lic_contacts_clients — Contacts d'un client (Sprint 10 — Lot 11, DEC-019)

Multi-type : un même client peut porter plusieurs contacts ACHAT, FACTURATION,
RESPONSABLE, TECHNIQUE, COMMERCIAL… → pas d'unique sur (client_id, type).
Le `type_contact_code` est une FK vers `lic_types_contact_ref(code)`,
référentiel SADMIN (DEC-012).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `client_id` | integer | NOT NULL, FK → lic_clients ON DELETE CASCADE | |
| `type_contact_code` | varchar(30) | NOT NULL, FK → lic_types_contact_ref(code) | ACHAT, FACTURATION, … |
| `nom` | varchar(100) | NOT NULL | |
| `prenom` | varchar(100) | — | |
| `email` | varchar(200) | — | Validé format email côté Zod |
| `telephone` | varchar(20) | — | |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | Soft delete = `actif=false` |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | matricule |
| `date_modif` | timestamp | — | |
| `modifie_par` | varchar(50) | — | matricule |

**Index** : `idx_contacts_clients_client (client_id)`,
`idx_contacts_clients_type (type_contact_code)`

**Permissions** :
- USER : lecture (via détail client)
- ADMIN+ : create / update / toggle actif / soft delete (via onglet Contacts)

### lic_fichiers_log — Suivi centralisé des fichiers (Sprint 10 — Lot 11, DEC-019)

Trace chaque génération de fichier de licence et chaque import healthcheck
avec son metadata complet. Alimentée exclusivement par `fichierLogService.record()`,
appelée par `downloadLicenceFileAction` (LICENCE/GENERE), `importHealthcheckFile`
(HEALTHCHECK/IMPORTE ou ERREUR) et tout flux d'erreur. Lue par EC-03a onglet
"Fichiers" et le nouvel écran `/files` (ADMIN+).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `type` | varchar(20) | NOT NULL, CHECK IN ('LICENCE','HEALTHCHECK') | |
| `statut` | varchar(20) | NOT NULL, CHECK IN ('GENERE','IMPORTE','PREVIEW','ANNULE','ERREUR') | |
| `client_id` | integer | FK → lic_clients | nullable |
| `licence_id` | integer | FK → lic_licences | nullable |
| `file_hash` | varchar(256) | — | SHA-256, partiel exposé en UI |
| `file_name` | varchar(255) | — | ex: `LIC-2025-001.enc` |
| `format_version` | varchar(10) | NOT NULL, DEFAULT '2.0' | Versionnement format |
| `metadata` | jsonb | — | `{ volumes_updated, modules_updated, errors_count, articles_concerned, ip_address, generated_at, ... }` |
| `genere_par` | varchar(50) | NOT NULL | matricule |
| `created_at` | timestamp | NOT NULL, DEFAULT NOW() | |

**Index** :
- `idx_fichiers_log_type_date (type, created_at DESC)`
- `idx_fichiers_log_client_date (client_id, created_at DESC)`
- `idx_fichiers_log_licence_date (licence_id, created_at DESC)`
- `idx_fichiers_log_statut`

**Statuts** :
- `GENERE` — fichier de licence chiffré généré + livré (téléchargement OK)
- `IMPORTE` — healthcheck importé sans erreur
- `PREVIEW` — healthcheck déchiffré et prévisualisé (Lot 12 — dry-run)
- `ANNULE` — flux preview interrompu par l'utilisateur (Lot 12)
- `ERREUR` — échec de génération ou erreurs unitaires lors d'un import

**Permissions** :
- ADMIN+ : list / getDetails / record (record en interne, pas exposé directement)

### lic_renouvellement — Dossiers de renouvellement

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `licence_source_id` | integer | NOT NULL, FK → lic_licences | |
| `licence_cible_id` | integer | FK → lic_licences | NULL tant qu'en cours |
| `statut` | renew_status_enum | NOT NULL, DEFAULT 'EN_COURS' | |
| `date_creation_dossier` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| `date_validation` | timestamp | — | |
| `valide_par` | varchar(50) | — | |
| `date_cloture` | timestamp | — | |
| `commentaire` | text | — | |

**Index** : `idx_renew_source`, `idx_renew_cible`, `idx_renew_statut`

### lic_alert_config — Règles d'alerte

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `client_id` | integer | FK → lic_clients | NULL = règle globale |
| `article_code` | varchar(50) | FK → lic_articles_ref | NULL = tous articles. Sprint 10 — Lot D3 (DEC-014) |
| `seuil_pct` | numeric(5,2) | NOT NULL, CK 1-100 | |
| `canal_alerte` | alert_channel_enum | NOT NULL | |
| `email_dest` | varchar(200) | — | Requis si canal contient EMAIL |
| `template_msg` | text | NOT NULL | Variables : {client} {produit} {article} {pct} {consomme} {total} {seuil} (`{module}` accepté pour compat) |
| `statut` | boolean | NOT NULL, DEFAULT TRUE | |
| `priorite` | integer | NOT NULL, DEFAULT 99 | Plus petit = plus prioritaire |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| CHECK | canal=BACKOFFICE OR email_dest IS NOT NULL | — | |

**Destinataires email** : Sales responsable + Account Manager de la fiche client
+ `email_dest` configuré dans la règle.

**Matching d'une règle** (Sprint 10 — Lot D3, DEC-014) — par ordre de spécificité :
1. `client_id = X` AND `article_code = A` (cible exacte)
2. `client_id = X` AND `module_code = produit_de_l_article` (legacy par produit)
3. `client_id = X` AND `article_code IS NULL` AND `module_code IS NULL` (toutes les règles du client)
4. `client_id IS NULL` AND `article_code = A` (article spécifique tous clients)
5. `client_id IS NULL` AND `article_code IS NULL` (règle globale)

À spécificité égale, `priorite` ASC. Le `module_code` legacy est traité comme un
mapping de produit ; il sera supprimé au Lot A4.

**Index** : `idx_alert_client`, `idx_alert_module`, `idx_alert_article`, `idx_alert_statut`

### lic_notifications — Notifications in-app

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `user_id` | varchar(50) | — | NULL = broadcast |
| `type` | varchar(50) | NOT NULL | LICENCE_EXPIRED, VOLUME_ALERT, RENEWAL_DUE, BATCH_ERROR… |
| `title` | varchar(200) | NOT NULL | |
| `message` | text | NOT NULL | |
| `priority` | notif_priority_enum | NOT NULL, DEFAULT 'MEDIUM' | |
| `client_id` | integer | FK → lic_clients | |
| `entity_type` | varchar(30) | — | |
| `entity_id` | integer | — | |
| `action_url` | varchar(500) | — | |
| `is_read` | boolean | NOT NULL, DEFAULT FALSE | |
| `read_at` | timestamp | — | |
| `created_at` | timestamp | NOT NULL, DEFAULT NOW() | |

**Index** : `idx_notif_user_unread WHERE is_read = FALSE`, `idx_notif_user_created`,
`idx_notif_created`

### lic_audit_log — Journal d'audit

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `entity` | varchar(30) | NOT NULL | licence, volume, key, user, client, entite… |
| `entity_id` | integer | NOT NULL | |
| `action` | varchar(30) | NOT NULL | CREATE, UPDATE, DELETE, SUSPEND, EXPIRE… |
| `before_data` | jsonb | — | NULL pour CREATE |
| `after_data` | jsonb | — | NULL pour DELETE |
| `user_id` | varchar(50) | NOT NULL | Matricule ou 'SYSTEM' |
| `client_id` | integer | — | Dénormalisé |
| `ip_address` | varchar(45) | — | |
| `mode` | audit_mode_enum | NOT NULL, DEFAULT 'MANUEL' | |
| `metadata` | jsonb | — | |
| `search_vector` | tsvector | GENERATED | DEC-002 FTS français |
| `created_at` | timestamp | NOT NULL, DEFAULT NOW() | |

**Colonne générée** (DEC-002) :
```sql
search_vector GENERATED ALWAYS AS (
  to_tsvector('french',
    coalesce(entity,'') || ' ' || coalesce(action,'') || ' ' ||
    coalesce(before_data::text,'') || ' ' || coalesce(after_data::text,'')
  )
) STORED
```

**Index** : `idx_audit_entity`, `idx_audit_user`, `idx_audit_client`,
`idx_audit_created`, `idx_audit_search GIN (search_vector)`

### lic_users — Comptes back-office

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `matricule` | varchar(20) | UNIQUE, NOT NULL | MAT-NNN |
| `nom` | varchar(100) | NOT NULL | En majuscules |
| `prenom` | varchar(100) | NOT NULL | |
| `email` | varchar(200) | UNIQUE, NOT NULL | Format @s2m.ma |
| `password_hash` | varchar(255) | NOT NULL | bcrypt cost 10 |
| `telephone` | varchar(20) | — | |
| `role` | user_role_enum | NOT NULL | SADMIN/ADMIN/USER |
| `actif` | boolean | NOT NULL, DEFAULT TRUE | |
| `must_change_password` | boolean | NOT NULL, DEFAULT FALSE | Force reset à la prochaine connexion |
| `locale` | varchar(10) | NOT NULL, DEFAULT 'fr' | Préférence langue (fr/en) |
| `derniere_connexion` | timestamp | — | Mis à jour au login via Auth.js signIn callback |
| `date_creation` | timestamp | NOT NULL, DEFAULT NOW() | |
| `cree_par` | varchar(50) | NOT NULL | |
| `date_modif` | timestamp | — | |
| `modifie_par` | varchar(50) | — | |

**Règles** :
- Login par défaut = partie avant `@` de l'email
- Mot de passe généré à la création : 10 chars lisibles (majuscule + minuscules + chiffres + 1 symbole)
- `must_change_password = true` à la création et au reset
- Un SADMIN ne peut pas se désactiver lui-même

**Index** : `idx_users_matricule (UNIQUE)`, `idx_users_email (UNIQUE)`, `idx_users_actif`,
`idx_users_matricule_asc`

### lic_settings — Paramétrage système (SADMIN)

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | serial | PK | |
| `cle` | varchar(100) | UNIQUE, NOT NULL | Clé de paramètre |
| `valeur` | text | NOT NULL | Valeur |
| `description` | varchar(500) | — | Libellé explicatif |
| `modifie_par` | varchar(50) | — | |
| `date_modif` | timestamp | NOT NULL, DEFAULT NOW() | |

**Paramètres par défaut** :

| Clé | Valeur défaut | Description |
|---|---|---|
| `seuil_alerte_defaut` | `80` | Seuil alerte volume (%) |
| `tolerance_volume_pct` | `5` | Marge tolérance volume fichier licence (%) |
| `tolerance_date_jours` | `30` | Marge tolérance date expiration (jours) |
| `warning_volume_pct` | `80` | Seuil warning volume fichier licence (%) |
| `warning_date_jours` | `60` | Jours avant expiration pour warning |
| `licence_file_aes_key` | `` | Clé AES-256 chiffrement fichier licence |
| `healthcheck_aes_key` | `` | Clé AES-256 déchiffrement healthcheck F2 |
| `smtp_configured` | `false` | SMTP opérationnel |
| `app_name` | `Portail Licences SELECT-PX` | Nom affiché |

### Tables de supervision batchs

**lic_batch_jobs**, **lic_batch_executions**, **lic_batch_logs** — inchangées.
Voir schema.sql pour le DDL complet.

---

## Relations (vue d'ensemble)

```
lic_clients (1) ──── (N) lic_entites
lic_clients (1) ──── (N) lic_alert_config
lic_clients (1) ──── (N) lic_audit_log (dénormalisé)
lic_clients (1) ──── (N) lic_notifications
lic_clients (1) ──── (N) lic_contacts_clients   [CASCADE]
lic_clients (0..1) ──── (N) lic_fichiers_log
lic_clients (1) ──── (N) lic_pays_ref (region_code FK)

lic_entites (1) ──── (N) lic_licences

lic_licences (1) ──── (N) lic_licence_produits  [CASCADE]
lic_licences (1) ──── (N) lic_licence_articles  [CASCADE]
lic_licences (1) ──── (N) lic_renouvellement (source et cible)
lic_licences (0..1) ──── (N) lic_fichiers_log

lic_licence_articles (1) ──── (N) lic_article_volume_history [CASCADE]

lic_produits_ref (1) ──── (N) lic_articles_ref
lic_produits_ref (1) ──── (N) lic_licence_produits
lic_articles_ref (1) ──── (N) lic_licence_articles

lic_regions_ref (1) ──── (N) lic_pays_ref
lic_regions_ref (1) ──── (N) lic_team_members
lic_types_contact_ref (1) ──── (N) lic_contacts_clients

lic_batch_jobs (1) ──── (N) lic_batch_executions
lic_batch_executions (1) ──── (N) lic_batch_logs   [CASCADE]
```

> Note (Sprint 10 — Lot 13, DEC-022) : les anciennes tables `lic_modules` /
> `lic_volumes` / `lic_volume_history` / `lic_modules_ref` / `lic_unites_ref` /
> `lic_interfaces_ref` ont été supprimées. Voir migration
> `0015_lot13_drop_old_tables.sql`.

---

## Jobs planifiés (pg-boss)

| Job | Fréquence | Rôle |
|---|---|---|
| `expire-licences` | `0 2 * * *` | Passe à EXPIRE les licences dont date_fin < now() |
| `check-alerts` | `0 */6 * * *` | Évalue les seuils, crée notifs + emails (Sales + AM + email_dest) |
| `auto-renewal` | `0 3 * * *` | Crée dossiers renouvellement à J-60 |
| `snapshot-volumes` | `0 1 1 * *` | Snapshot mensuel `lic_article_volume_history` (Sprint 10 — Lot D5 : la branche legacy `lic_volume_history` a été retirée). Le `job_code` reste inchangé pour préserver les traces historiques en BD ; le `job_nom` UI EC-12 est désormais "Snapshot mensuel des articles" |

---

## Note d'évolution — Sales responsable / Account Manager (sprint 9)

Les colonnes `lic_clients.sales_responsable` et `lic_clients.account_manager`
sont actuellement de type `varchar(100)` libre. Le job `check-alerts` (N-004/N-006)
tente d'envoyer un email à ces destinataires en plus de `email_dest` de la règle :

- Si la valeur est un email valide → ajoutée aux destinataires
- Sinon (nom seul) → ignorée silencieusement

**À clarifier** : faut-il imposer un format email, dénormaliser via une table
`lic_users` (Sales/AM = comptes BO existants), ou ajouter deux colonnes
`sales_email` / `account_manager_email` distinctes ? À trancher avec les équipes
finance et commercial.

---

## Fichier de licence chiffré v2 (DEC-007 / DEC-020)

**Sprint 10 — Lot 12A** : le format JSON v2 reflète la structure
Produit → Article du catalogue commercial (DEC-013/DEC-014). Le format
binaire est versionné : `[magic LICF (4o)][version (1o)][iv (12o)][tag (16o)][ciphertext]`.
La fonction `decryptLicenceFile` accepte v1 (legacy modules/volumes) **et** v2
pour rétrocompat des archives existantes ; `generateEncryptedLicenceFile`
n'écrit que v2.

```json
{
  "format_version": "2.0",
  "licence_ref": "LIC-2025-001",
  "client": {
    "code": "CDM",
    "raison_sociale": "Crédit du Maroc",
    "pays": "MA"
  },
  "entite": {
    "nom": "Siège CDM",
    "pays": "MA"
  },
  "date_debut": "2025-01-01",
  "date_fin": "2027-04-23",
  "tolerance_volume_pct": 5,
  "tolerance_date_jours": 30,
  "warning_volume_pct": 80,
  "warning_date_jours": 60,
  "produits": [
    {
      "code": "SPX_ACQUIRING",
      "libelle": "SelectPX Acquiring Suite",
      "actif": true,
      "articles": [
        {
          "code": "ATM_STD_SPX",
          "libelle": "ATM Management (standard)",
          "actif": true,
          "volume": {
            "contractuel": 800,
            "unite": "Nombre de GAB",
            "tolerance_pct": 5
          }
        },
        {
          "code": "VISA_POS_ACQ_SPX",
          "libelle": "Visa POS acquiring",
          "actif": true,
          "volume": null
        }
      ]
    }
  ],
  "generated_at": "2026-04-25T11:00:00Z",
  "expires_check_at": "2026-05-25T11:00:00Z"
}
```

**Évolution depuis v1** : `modules[].volumes{...}` → `produits[].articles[].volume`.
Les articles sans volume contractuel exposent `volume: null`. Les libellés
produits/articles + libellé d'unité sont inclus dans le payload (utile pour
la sandbox SADMIN — Lot 12B).

Livraison : ZIP protégé par mot de passe, communiqué séparément au client.
F2 dépose le fichier dans un dossier surveillé par son supervisor pour
consommation.

---

## Fichier healthcheck F2 v2 (DEC-008 / DEC-020)

**Sprint 10 — Lot 12A** : nouveau format JSON v2 attendu en input,
aligné sur la structure produits/articles. Workflow d'import en deux phases
(preview dry-run + confirmation/annulation explicite).

```json
{
  "format_version": "2.0",
  "client_code": "CDM",
  "licence_ref": "LIC-2025-001",
  "generated_at": "2026-04-20T08:30:00Z",
  "produits_installes": [
    {
      "code": "SPX_ACQUIRING",
      "articles": [
        { "code": "ATM_STD_SPX", "vol_consomme": 350 },
        { "code": "VISA_POS_ACQ_SPX", "vol_consomme": null }
      ]
    }
  ]
}
```

Validation runtime stricte par Zod (`healthcheckSchemaV2`).

### Workflow Preview → Confirm / Cancel

1. **`previewHealthcheck(ctx, encBuffer)`** — déchiffre, parse, recherche
   la licence cible (par `licence_ref`), compare chaque article du HC à
   `lic_licence_articles`. Construit `volumeChanges[]`, `orphanArticles[]`
   (présents dans le HC mais pas dans la licence), `missingArticles[]`
   (présents dans la licence mais pas dans le HC), `warnings[]`. Trace
   PREVIEW dans `lic_fichiers_log` (statut `PREVIEW`). **Aucune mutation
   des volumes**. Retourne `previewLogId` pour la phase 2.

2. **`confirmHealthcheckImport(ctx, previewLogId)`** — relit la trace
   PREVIEW, applique chaque `vol_consomme` dans `lic_licence_articles`,
   audit log par article (`entity='licence_article'`,
   `metadata.source='healthcheck'`, `previewLogId`). Trace une nouvelle
   entrée IMPORTE (ou ERREUR si erreurs unitaires) avec
   `metadata.preview_log_id` pour le lien.

3. **`cancelHealthcheckImport(ctx, previewLogId)`** — trace ANNULE liée à
   la preview, sans mutation. La preview reste `PREVIEW` (audit complet) ;
   c'est l'entrée ANNULE qui matérialise la décision.

### Champs metadata dans `lic_fichiers_log`

| statut | metadata clés |
|---|---|
| `PREVIEW` | `client_code`, `client_id`, `licence_id`, `licence_ref`, `generated_at`, `volume_changes[]`, `orphan_articles[]`, `missing_articles[]`, `warnings[]` |
| `IMPORTE` | `preview_log_id`, `licence_ref`, `volumes_updated`, `modules_updated=0`, `errors_count`, `errors[]` |
| `ANNULE` | `preview_log_id`, `licence_ref`, `generated_at` |
| `ERREUR` | `phase` (`preview`/`confirm`), `error`, contextes selon phase |

Ces traces alimentent EC-Files (Sprint 10 — Lot 11) et permettent
l'audit fin du workflow (qui a vu quoi, qui a confirmé/annulé, quand).

---

## Règles métier transverses

1. **Audit obligatoire** — toute mutation appelle `auditLog.record()` dans la même transaction.
2. **Optimistic locking** — `version` incrémenté sur UPDATE, service vérifie `WHERE id = ? AND version = ?`.
3. **Soft delete** — pas de DELETE sur `lic_clients`, `lic_entites`, `lic_licences`, `lic_users`.
4. **Hard delete** — autorisé sur `lic_modules`, `lic_volumes`.
5. **userId = 'SYSTEM'** pour toute action de job.
6. **Références licences** — `LIC-AAAA-NNN`, compteur séquentiel par année.
8. **Affichage utilisateur** — toujours `Prénom NOM (MAT-XXX)`, jamais le matricule seul.
9. **Erreurs de permission** — page 403 propre, jamais de crash 500.
10. **Labels techniques** — masqués en production (`NODE_ENV !== 'development'`).
11. **Tris par défaut** :
    - Licences : `date_creation DESC`
    - Volumes : `licence_id ASC, unite_code ASC`
    - Historique : `created_at DESC`
    - Users : `matricule ASC`
    - Clients : `raison_sociale ASC`
    - Entités (par client) : `actif DESC, nom ASC`
    - Renouvellements : `date_creation_dossier DESC`

---

## Permissions par rôle

| Écran | USER | ADMIN | SADMIN |
|---|:---:|:---:|:---:|
| EC-01 Dashboard | R | R | R |
| EC-02/03 Licences | R | R+W | R+W+D |
| EC-Clients | R | R+W | R+W+D |
| EC-04 Volumes | R | R+W (seuils + vol_consomme) | R+W |
| EC-06 Journal des modifications | R | R | R |
| EC-07 Alertes | — | R+W | R+W |
| EC-08 Utilisateurs | — | — | R+W |
| EC-09 Rapports | R | R | R |
| EC-10 Notifications | R (ses propres) | R | R |
| EC-11 Renouvellements | — | R+W | R+W+V |
| EC-12 Batchs | — | R+M | R+M+T |
| EC-13 Paramétrage | — | — | R+W |
| EC-14 Profil | R+W (ses propres) | R+W | R+W |
