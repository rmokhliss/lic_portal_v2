# 0017 — PK `serial` pour les 6 tables référentiels paramétrables

## Status

Accepted — Mai 2026 (Phase 2.B étape 1/7)

## Context

L'ADR 0005 fixe `uuidv7` (PG 18) comme PK pour **toutes les tables métier** LIC v2 — non-énumérables, future-proof réplication, génération distribuée possible.

La Phase 2.B introduit 6 tables référentielles paramétrables SADMIN (data-model §"Tables référentielles paramétrables") :

- `lic_regions_ref`, `lic_pays_ref`, `lic_devises_ref`, `lic_langues_ref`, `lic_types_contact_ref`, `lic_team_members`

Pour chacune, l'identifiant **réellement utilisé** par le métier est un **code logique stable** (`region_code`, `code_pays` ISO, `code_devise` ISO, `code_langue` ISO, `code` type contact). Les FK depuis les autres tables pointent vers ces codes, **pas** vers un `id` interne :

- `lic_pays_ref.region_code → lic_regions_ref(region_code)`
- `lic_team_members.region_code → lic_regions_ref(region_code)`
- `lic_contacts_clients.type_contact_code → lic_types_contact_ref(code)` (Phase 4)

Les bénéfices `uuidv7` ciblés par 0005 ne s'appliquent pas à ces tables :

- **Non-énumérabilité** : sans intérêt — les codes (`MAD`, `EUR`, `fr`) sont publics par construction et figurent en dur dans la spec.
- **Génération distribuée / réplication** : sans intérêt — ces tables sont éditées exclusivement depuis `/settings` (SADMIN, mono-instance) et sont en lecture seule pour le reste de l'app.
- **Future-proof multi-instance** : sans intérêt — volume très faible (<200 lignes total cumulé sur les 6 tables), réplication triviale par re-seed.

À l'inverse, `uuidv7` ajoute du bruit dans les seeds, dans Drizzle Studio, et dans les rapprochements manuels avec des données ISO existantes (codes pays/devise standards).

Les 6 tables référentiels sont **strictement assimilables à des enums versionnables en BD** : codes courts stables, libellés éditables, drapeau `actif` pour soft-disable. Le serial `id` n'est utilisé que comme PK technique — jamais référencé en FK.

## Decision

Les 6 tables référentielles utilisent **PK `serial`**, exception explicite à l'ADR 0005 :

- `lic_regions_ref` — `id serial PRIMARY KEY`, FK reçue par `region_code`
- `lic_pays_ref` — `id serial PRIMARY KEY`, FK reçue par `code_pays`
- `lic_devises_ref` — `id serial PRIMARY KEY`, FK reçue par `code_devise`
- `lic_langues_ref` — `id serial PRIMARY KEY`, FK reçue par `code_langue`
- `lic_types_contact_ref` — `id serial PRIMARY KEY`, FK reçue par `code`
- `lic_team_members` — `id serial PRIMARY KEY` (cas particulier : pas de FK reçue par code, mais même règle pour cohérence des 6 tables paramétrables ; les FK qui viendront pointeront vers une combinaison nom/email lisible si besoin, jamais vers l'`id`)

**Toutes les autres tables LIC v2 conservent `uuidv7`** conformément à l'ADR 0005 — métier, audit, batchs, fichiers, sessions, users, etc.

## Consequences

**Bonnes**

- Seeds lisibles : `INSERT INTO lic_regions_ref (region_code, nom) VALUES ('NORD_AFRIQUE', ...)` — pas de uuid à pré-générer.
- Rapprochement direct avec les données ISO existantes (devises XOF/XAF/EUR, pays MA/SN/CI, langues fr/en) — `code_*` est l'identifiant universel.
- Drizzle Studio + audit lisibles (id 1-200 plutôt qu'uuid).
- Cohérent avec la nature "enum versionable BD" de ces référentiels.

**Mauvaises**

- Hétérogénéité PK dans le schéma : 2 tables système (`lic_users`, `lic_settings`, `lic_audit_log`) en `uuidv7` + 6 référentiels en `serial`. Risque de confusion développeur — atténué par la règle simple "FK vers référentiel = code logique, jamais id".
- Si un jour un de ces référentiels devait recevoir une FK uuid (ex: `lic_audit_log.entity_id` ciblant un `region_id`), la cohérence serait à reconstruire. Probabilité très faible : les référentiels paramétrables ne sont jamais audités directement (l'audit cible les entités métier qui les référencent).

**Neutres**

- Aucun impact sur les performances : ces tables sont lues en cache applicatif (TanStack Query) après chargement initial.
- Le compteur serial est purement interne — jamais exposé en URL ni en API.
- L'ADR 0005 reste **autorité unique** pour toutes les tables métier ; cette exception est strictement bornée aux 6 référentiels paramétrables listés ci-dessus.
