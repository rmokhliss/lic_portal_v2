# 0007 — Seed démo réutilisé du v1 (sprint 10 lot A5) avec adaptation v2

## Status
Accepted — Avril 2026

## Context

LIC v2 a besoin d'un jeu de données démo riche pour :
- Permettre aux équipes commerciales/finance S2M de naviguer dans une UI réaliste dès la phase 4 (clients/entités)
- Tester les écrans avec des cas variés (cas nominal, alerte, dépassé, multi-produits, multi-versions SPX/SSV6, renouvellement en cours, healthchecks importés, etc.)
- Faire des démos clients sans avoir à inventer des données plausibles

Le projet **LIC v1** dispose déjà d'un jeu de données mature : `demo-data.sql` du sprint 10 lot A5 (DEC-016 v1) — **759 lignes** contenant :
- **55 clients réels SELECT-PX** : Bank Al-Maghrib, BMCE, Attijariwafa, CIH, BCP, UBA CI, NDB Zambia, BIAT, BMCI, Crédit du Maroc, BNI Côte d'Ivoire, etc., couvrant 8 régions et 23 pays
- **5 licences phares** couvrant tous les scénarios métier (cas nominal multi-produits, alerte 90%, dépassé 104%, version SSV6, mobile/SoftPOS, renouvellement en cours)
- **6 référentiels paramétrables** seedés (régions, pays, devises, langues, types contacts, équipes — 18 membres)
- **Catalogue commercial complet** : 19 produits + 89 articles (30 avec volume + 59 sans)
- **48 snapshots historiques** (8 articles × 6 mois) pour valider les calculs `computeArticleTrend` et `computeArticleProjection`
- **3 dossiers de renouvellement** sur BIAT (statuts EN_COURS / VALIDE / CREE)
- **Healthchecks démo seedés** (DEC-021 v1) pour démontrer le workflow dry-run

Cette base de données a été **éprouvée pendant 11 sprints** : elle reflète la réalité commerciale, déclenche correctement tous les calculs métier (statuts, tendances, projections, alertes), et permet de démontrer chaque écran sans data-engineering supplémentaire.

Deux options évaluées :

1. **Réutiliser tel quel** le `demo-data.sql` v1 — gain de temps maximal mais incompatible avec les évolutions v2 (uuidv7, schémas Drizzle, dénormalisations audit log)

2. **Réécrire from scratch** — beaucoup de travail pour un résultat équivalent en moins riche

3. **Réutiliser et adapter** — récupérer le contenu métier (raisons sociales, régions, produits, articles, scénarios) et adapter au schéma v2

## Decision

**Option 3 — réutilisation adaptée**.

Le seed v2 est implémenté en TypeScript dans `app/src/server/infrastructure/db/seed.ts` et reprend **les données métier** du `demo-data.sql` v1 (55 clients, 19 produits, 89 articles, 5 licences, scénarios variés) en les adaptant aux évolutions v2 :

### Adaptations obligatoires

| Aspect | v1 | v2 |
|---|---|---|
| **IDs primaires** | `serial` (entiers) | `uuidv7` PG 18 (cf. ADR 0005) |
| **Format seed** | `demo-data.sql` (SQL pur) | `seed.ts` (TypeScript + Drizzle insertions typées) |
| **Audit log** | Champs internes uniquement | Inclut `user_display` + `client_display` dénormalisés (DETTE-001 traitée — cf. ADR 0004) |
| **Schémas** | `lic_modules`, `lic_volumes` (legacy supprimé sprint 13) | Modèle exclusif `lic_licence_produits` + `lic_licence_articles` (cf. ADR 0006) |
| **Catalogues** | `pays`, `devise`, `region` parfois en champs libres | FK strictes vers `lic_pays_ref`, `lic_devises_ref`, `lic_regions_ref` (cf. règle SADMIN DEC-012 v1) |
| **Statuts calculés** | Vue `v_lic_liste` | VIRTUAL columns PG 18 sur `lic_licences` |
| **Mots de passe** | bcrypt cost 10 | Identique (bcryptjs cost 10) — graine `must_change_password = true` pour comptes seedés |
| **Dates** | `timestamp` sans précision fuseau | `TIMESTAMPTZ` UTC strict (Référentiel §4.16) |
| **Format binaire fichiers** | v1 (legacy) | v2 (cf. ADR 0002 — JSON clair + signature RSA + certif client embarqué) |

### Conventions du seed v2

- **Idempotent** : `pnpm db:seed` peut être lancé plusieurs fois sans erreur. Utilise `ON CONFLICT DO NOTHING` pour les catalogues, TRUNCATE pour les tables transactionnelles.
- **Découplé du `db:reset`** : `db:reset` = `drop` + `migrate` + `seed`, mais `seed` peut tourner seul sur une base déjà migrée.
- **Audit log seedé** avec `user_id = 'SYSTEM'` et `mode = 'JOB'` pour les entrées initiales.
- **Healthchecks démo** : générés via `crypto/healthcheck.ts` puis insérés dans `lic_fichiers_log` avec `statut = IMPORTE` (cf. workflow dry-run ADR 0007 anticipé).
- **Comptes BO de démo** : 5 utilisateurs (1 SADMIN, 2 ADMIN, 2 USER) avec mots de passe documentés dans `docs/reference/seed-credentials.md` (NE PAS commiter).
- **Volumétrie cible v2** identique à v1 sprint 10 lot A5 (cf. tableau dans `PROJECT_CONTEXT_LIC.md` ou referencer le `data-model.md` v1 dans `docs/reference/`).

### Source de référence

Le fichier original v1 est copié dans `docs/reference/` (lecture seule, jamais exécuté par le code v2) :
- `docs/reference/demo-data-v1.sql` — le SQL original 759 lignes
- `docs/reference/data-model-v1.md` — la spec détaillée du modèle v1 sprint 13

Quand Claude Code écrit le seed v2 en phase 4, il consulte ces fichiers comme **référence**, jamais comme code à copier.

### Phasage du seed v2

Le seed n'est pas écrit d'un bloc — il s'enrichit phase par phase :

| Phase | Tables peuplées dans `seed.ts` |
|---|---|
| **2** Référentiels SADMIN | `regions_ref`, `pays_ref`, `devises_ref`, `langues_ref`, `types_contact_ref`, `team_members`, `produits_ref`, `articles_ref` (catalogues complets) + `users` (5 comptes BO) + `settings` (clés + paramètres) |
| **4** Clients/Entités | `clients` (55), `entites` (55, 1 "Siège" par client), `contacts_clients` (variés par client) |
| **5** Licences | `licences` (5 phares + cibles renouvellement), `licence_produits`, `licence_articles` |
| **6** Volumes | `article_volume_history` (48 snapshots = 8 articles × 6 mois pour LIC-2025-001 et LIC-2025-002) |
| **8** Alertes/notifs | `alert_config` (3 règles), `notifications` (3 démo) |
| **9** Renouvellements | `renouvellement` (3 dossiers BIAT EN_COURS/VALIDE/CREE) |
| **10** Fichiers | `fichiers_log` (PREVIEW + IMPORTE + ANNULE + ERREUR + GENERE pour licences phares) + génération réelle de quelques `.lic` chiffrés via `crypto/licence-file.ts` |
| **12** Batchs | `batch_executions` (2 historiques : 1 succès + 1 erreur), `batch_logs` (1 ligne) |

### Point d'entrée UI (DEC-021 v1)

L'écran SADMIN `/settings/demo` (cf. `PROJECT_CONTEXT_LIC.md` section 8.3 écran 15) appelle `seedDemoDataAction` qui exécute le **même flux** que `pnpm db:seed`. Idempotent. Permet à l'équipe commerciale de recharger la démo depuis l'UI sans CLI (avec confirmation forte pour le cleanup).

## Consequences

**Bonnes**
- Démarrage immédiat avec un jeu **éprouvé** dès la phase 4 (gain ~2 semaines vs réécriture from scratch)
- Démos client réalistes (banques connues, scénarios réels) dès le premier déploiement
- Tous les calculs métier (statuts, tendances, projections, alertes, renouvellements) sont validables avec les mêmes données qu'en v1 — pas de régression silencieuse
- Le seed v2 typé en TypeScript/Drizzle bénéficie de l'autocomplétion IDE et du typecheck (vs SQL pur v1)

**Mauvaises**
- Adaptation non triviale : conversion `serial` → `uuidv7`, mapping vers schémas Drizzle, dénormalisations audit log, format binaire v2 fichiers — ~1 sprint de travail réparti sur les phases 4-10
- La cohérence référentielle entre les phases doit être maintenue (un client référencé en phase 5 doit exister en phase 4) — tests d'idempotence nécessaires

**Neutres**
- Les fichiers `docs/reference/demo-data-v1.sql` et `docs/reference/data-model-v1.md` restent en dépôt comme **référence read-only** (jamais exécutés par le code v2)
- Les comptes BO démo (mots de passe générés) sont gérés hors dépôt (fichier `.local.md` ignoré par git, ou settings UI)
- Si le besoin évolue (clients de démo différents pour un autre marché), le seed peut être modifié sans impact sur le code applicatif (séparation claire seed ↔ runtime)
