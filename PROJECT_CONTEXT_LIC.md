# PROJECT_CONTEXT — s2m-lic (LIC v2)

> Lu en début de chaque session par Claude Code, avec :
>
> 1. Le **Référentiel Technique S2M v2.1** (règles transverses universelles, 25 pages)
> 2. Le **CLAUDE.md** racine du projet (extrait condensé pour Claude Code, ≤300 lignes)
> 3. Ce document — **spécifique LIC v2** (métier, périmètre, décisions, état)
>
> Mise à jour à chaque session significative. Toute évolution structurelle ajoute un ADR dans `docs/adr/`.

---

## 1. Identité du projet

| Élément          | Valeur                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ----------- |
| Nom interne      | `s2m-lic`                                                                                                           |
| Nom commercial   | **Licence Manager**                                                                                                 |
| Code produit     | **LIC**                                                                                                             |
| Branding         | `NEXT_PUBLIC_PRODUCT_CODE=LIC`, `NEXT_PUBLIC_PRODUCT_NAME="Licence Manager"`, `NEXT_PUBLIC_PRODUCT_SUFFIX="Portal"` |
| Wordmark affiché | `SELECT-PX                                                                                                          | LIC_PORTAL` |
| Codes erreur     | `SPX-LIC-NNN` (format Référentiel §4.5)                                                                             |
| Repo cible       | https://github.com/rmokhliss/lic_portal_v2 (branche `main`)                                                         |
| Type             | **Mono-tenant** (les "clients" sont des données, pas des tenants)                                                   |
| Audience         | Équipes commerciales et finance S2M (interne)                                                                       |
| Statut           | **Projet pilote** du Référentiel S2M v2.1                                                                           |

### Métier en deux phrases

LIC est le portail back-office S2M qui pilote tout le cycle de vie commercial des licences SELECT-PX vendues aux banques africaines : du contrat signé jusqu'à la consommation réelle des modules sur F2 (le supervisor déployé chez le client), en passant par les renouvellements, les alertes de dépassement, et la traçabilité réglementaire des fichiers échangés.

C'est **le seul endroit** où S2M sait qui a droit à quoi, jusqu'à quand, à quel volume, et où en est la consommation côté client.

### Statut pilote

LIC v2 est le **premier projet** à appliquer le Référentiel S2M v2.1. Conséquences :

- Les écarts justifiés vs Référentiel sont consignés en ADR (`docs/adr/`).
- Les briques `@s2m/core-*` n'existent pas encore — implémentées **en local** dans LIC v2 (cf. section 7), elles remonteront en packages partagés une fois éprouvées.
- Toute amélioration découverte sur LIC v2 est remontée à l'équipe Référentiel.

---

## 2. État d'avancement

**Phase actuelle** : **Phases 1 → 22 v2 closes (Mai 2026)** — back-office complet livré + durcissement sécurité prod + brique PKI bouclée + module email + audit Master + Phase 17 (refonte seed v1 + 4 stubs débloqués + theme toggle + demo tab) + Phase 18 (corrections post-tests utilisateur R-01→R-23, R-13 différé) + Phase 19 (R-13 controleVolume + Chromium Docker) + Phase 20 (R-24→R-35, R-30 wizard 3 étapes différé Phase 21 + 4 fixes critiques bloquants prod : typeName minif, dark mode, logout, code regex) + Phase 21 (R-29 complet Région+SansLicence + R-30 wizard licence 3 étapes) + Phase 22 v1 (R-36 reload-demo réordonné + R-37 logo light figé slate + R-38 ISO Date notifications + R-39/40 sandbox templates F2 enrichis) + Phase 22 v2 (R-41 purge UI clarté + R-44 cache referentiels Next 16 updateTag + R-46/48 wizard depuis fiche client + articles robustes + R-49/50 .lic disabled sans articles + backfill description + R-51 controleVolume 15 articles non volumétriques). **MVP livré, prêt pour push origin/main**.

**Phase 22 v2 close (Mai 2026) — Cache referentiels + wizard fiche client + articles robustes + UX .lic** : 6 retours résiduels (R-41/44/46/47/48/49/50/51) fermés. R-36/38/42/43 audités (déjà couverts Phase 22 v1 + seed bootstrap). R-45 deferred (refacto retour structuré `{success,error}` non scopé ici).

R-41 — Purge démo : message UI explicite (CA PKI préservée)

- `DemoToolsPanel.tsx` : description Dialog confirmation enrichie. Distinction « données métier » (purgées : clients, licences, contacts, entités, renouvellements, notifications, alertes, fichiers, volumes, audit) vs « configuration système » (préservée : CA PKI, settings, référentiels pays/régions/devises/langues/équipe/catalogue, utilisateurs).

R-44 — Cache 60s référentiels (pays, régions, devises, langues, team-members)

- `lib/cached-referentials.ts` : nouveau helper avec wrappers `unstable_cache` TTL 60s + tags par scope (`referentials:pays/regions/devises/langues/team-members`). Variantes par rôle (SALES/AM/DM) pour team-members via clé incluant le rôle.
- `clients/page.tsx` : 5 calls référentiels remplacés par les wrappers cachés. Gain : suppression de 5 round-trips BD à chaque render.
- `settings/_actions.ts` : 12 mutations (create×6 + update×6 + toggle×6 sauf type-contact) ajoutent `updateTag(REFERENTIALS_TAG_<scope>)` après le `revalidatePath` existant. **Note Next 16** : l'API a changé — `revalidateTag(tag)` exige désormais 2 args, on utilise `updateTag(tag)` (read-your-own-writes en Server Action) qui flush le cache + le déclencheur de revalidation côté client.
- Conflit Stop validate utilisateur évité : invalidation explicite à chaque mutation, pas de divergence > 60s.

R-46 — Wizard depuis fiche client (`/clients/[id]/licences`)

- `NewLicenceDialog.tsx` étendu : props `lockedClientId?: string` + `triggerLabel?: string`. Quand `lockedClientId` est fourni, l'étape 1 affiche un input read-only au lieu du combobox SearchableSelect (le client est figé sur le client courant).
- `clients/[id]/licences/page.tsx` : Server Component fetch désormais le catalogue (`listProduitsUseCase` + `listArticlesUseCase` actifs) en parallèle avec entités + licences ; passe les props au LicencesTab.
- `LicencesTab.tsx` : refacto — l'ancien Dialog inline (Phase 5) est retiré au profit du wizard 3 étapes (Phase 21 R-30) avec `lockedClientId={props.clientId}`. Un seul flux de création licence dans toute l'app.

R-47 — Audit revalidatePath + tri licences

- Audit `revalidatePath` complet sur `clients/_actions.ts`, `clients/[id]/_actions.ts`, `licences/_actions.ts`, `licences/[id]/_actions.ts` : tous les Server Actions mutateurs (création, update, toggle, status, articles) ont leur `revalidatePath`. La création licence depuis la fiche client est gérée via `router.refresh()` côté wizard (Phase 21).
- Tri colonnes date début/fin sur `/licences` : reporté — nécessite extension du port `LicenceRepository.findPaginated` (param `sortBy`/`sortOrder`) + adapter SQL ORDER BY conditionnel + UI headers cliquables. Hors scope sprint courant.

R-48 — Wizard articles robustes (try/catch par article)

- `NewLicenceDialog.tsx` : la boucle d'ajout articles wrappe désormais chaque `addArticleAfterCreateAction` dans son propre try/catch. Les échecs sont collectés dans `articleErrors[]` (state) et affichés en alerte rose à l'étape 3 : « Licence créée — N article(s) non attaché(s) : <code> (<message>) ». L'utilisateur garde la licence créée et peut compléter via `/licences/[id]/articles`.

R-49 — Bouton « Générer .lic » disabled sans articles

- `licences/[id]/resume/page.tsx` : Server Component ajoute `listArticlesByLicenceUseCase.execute(id)` au Promise.all → comptage articles côté serveur.
- `LicenceResumeTab.tsx` + `GenerateLicFileButton` : prop `articlesCount`. Si 0 → bouton `disabled` avec tooltip « Aucun article attaché à cette licence ». Les messages PKI/CA sont déjà gérés par le `humanizeError` Phase 20 R-31 (SPX-LIC-411/412/413).

R-50 — Description backfill enrichie

- `CASection.tsx` section Backfill : description complétée (« Le backfill génère un certificat PKI X.509 pour chaque client qui n'en a pas encore. Ce certificat est nécessaire pour signer les fichiers .lic envoyés aux clients (format F2). La clé privée est chiffrée AES-256-GCM avec APP_MASTER_KEY et stockée de manière sécurisée. Durée estimée : ~2s par client. »).

R-51 — controleVolume `false` pour articles non volumétriques

- `phase6-catalogue.seed.ts` : `applyControleVolumeOverrides` étendu de 3 articles (Phase 19 R-13) à **15 articles non volumétriques** : `HSM`, `SMTP-GW`, `OPEN-API`, `REPORTING`, `ALERTS`, `ARCHIVING`, `SWITCH-ISO`, `SWITCH-INST`, `ATM-ADV`, `POS-ADV`, `SSV6-FRAUD`, `SOFTPOS-APP`, `WALLET-CORE`, `TOKEN-CORE`, `SSV6-KERNEL`. UPDATE inverse `controle_volume = true` pour les 15 articles volumétriques (KERNEL, SMS-GW, ATM-STD/POS-STD, ECOM, ISS-_, SSV6-_ hors KERNEL/FRAUD) — garantit la convergence d'état même si un override précédent les avait passés à false.
- AddArticleDialog (existant) : déjà conditionnel sur `article.controleVolume` côté UI Phase 19 R-13 — pas de modif nécessaire.

R-36/R-38/R-42/R-43 — audit (déjà couvert pré-Phase 22 v2)

- R-36 reload-demo : ordre seeds aligné Phase 22 v1. Toutes les phases requises (4/5/6/8-alerts/8-notifications/10) présentes. Idempotence : chaque seed a son propre garde-fou (early-return COUNT >0 ou tag DEMO_SEED).
- R-38 fix Date : appliqué Phase 22 v1 dans `phase8-notifications.seed.ts` (`.toISOString()` sur `createdAt`/`readAt`). Pas d'autre seed à risque (les Date sont passées via Drizzle/repos hors SQL tagged).
- R-42 settings par défaut : `seedSettings` (`db/seed.ts:384`) insère déjà 10 valeurs ON CONFLICT DO NOTHING, dont les 5 demandées (`seuil_alerte_defaut`, `tolerance_volume_pct`, `tolerance_date_jours`, `warning_volume_pct`, `warning_date_jours`). `lic_settings` n'est pas purgée par F2 — pas de re-insert nécessaire au reload.
- R-43 snapshots volumes 3 mois : déjà inséré par `seedPhase6Catalogue` (`seedVolumeSnapshots` lignes 308-345) — ratio 30%→80% progressif sur 3 mois, 1 article/licence pour les 20 licences seed.

R-45 — deferred (refacto retour structuré non scopé)

- Pattern actuel : Server Actions throw → composant client try/catch → `<p className="text-destructive">`. Fonctionnel et déjà en place sur tous les dialogs critiques (createLicence, createUser, createClient, createEntite, createContact, etc.).
- Refacto vers `{ success: false, error: msg }` = changement contract massif sur ~25 Server Actions + leurs callers. Sprint dédié à prévoir.

**Phase 22 close (Mai 2026) — Reload-demo + logo + sandbox F2** : 5 retours post-tests utilisateur fermés.

R-36 — reload-demo : ordre seeds aligné docs F2 + idempotence

- `reload-demo.ts` : `phase8-alerts` exécuté AVANT `phase8-notifications` (alignement docs F2 chronologie). Aucune nouvelle dépendance FK introduite — les notifs ne référencent pas les alertes.
- Idempotence : chaque seed avait déjà son propre garde-fou (early-return sur COUNT >0 ou tag DEMO_SEED). Documenté dans le header.
- Settings : `lic_settings` n'est PAS purgée par `purgeDemoData()` (cf. purge-demo.ts ligne 4-7 — préservée avec users + référentiels). Les settings bootstrap (`expose_s2m_ca_public`, `healthcheck_shared_aes_key`) survivent → aucun re-insert nécessaire au reload.

R-37 — Logo light fix définitif

- `SpxTile.tsx` : fond du tile passé de `var(--color-surface-1)` (qui flip clair en mode light → blanc-sur-clair invisible) à `#0F172A` slate-900 fixe. Path blanc + dégradé cyan-bleu garantis lisibles en light ET dark, comme un favicon (identité visuelle indépendante du thème global).
- Phase 20 R-26 traitait le texte du `BrandLockup` (vars DS adaptatives) ; le tile lui-même restait au comportement Phase 17 buggé en mode light.

R-38 — Fix `Received an instance of Date` dans phase8-notifications.seed

- `phase8-notifications.seed.ts` : `createdAt` et `readAt` sérialisés explicitement en `.toISOString()` avant binding postgres.js. Sans cette conversion, certains setups Node 24 + postgres@3.5 rejettent l'instance Date ("Received an instance of Date" lors du binding TIMESTAMPTZ). ISO string = format universellement accepté.

R-39/R-40 — Sandbox : templates `.lic`/`.hc` complets + scénario F2 documenté

- Section « Templates fichiers » : `LIC_TEMPLATE_TEXT` enrichi en format texte multi-section (JSON + `--- SIGNATURE S2M ---` + `--- CERTIFICATE S2M ---`) avec produits → articles structurés, volumes conditionnels (`null` + `illimite: true` pour articles `controleVolume=false`), dates période, signature placeholder. `HC_TEMPLATE` enrichi avec `version`, `clientCode`, `importedAt`.
- Nouvelle section « Scénario F2 — Test end-to-end » : intro + liste numérotée 5 étapes (générer paire RSA → signer .lic → vérifier signature → chiffrer .hc → déchiffrer .hc) + note règle L16 (sandbox sans persistance, artefacts non-acceptés par les imports prod).

**Phase 21 close (Mai 2026) — Wizard licence + filtres clients complets** : 2 retours résiduels Phase 20 fermés.

R-29 complet — filtre Région + filtre Sans licence active

- Port `ClientRepository.FindClientsPaginatedInput` étendu (additif) : `regionCode?: string` (sub-query `lic_pays_ref.region_code`) + `sansLicence?: boolean` (NOT EXISTS sur `lic_licences` ACTIF). Sub-query préférée à un JOIN pour ne pas casser la shape COUNT(\*) cross-pagination.
- Adapter `client.repository.pg.ts` : 2 conditions ajoutées dans `businessConditions` (donc COUNT total reflet du filtre).
- Use-case `list-clients.usecase.ts` : forward strict des 2 nouveaux filtres dans `opts`.
- UI clients/page.tsx + ClientsTable : `<select id="region">` (régions actives via `listRegionsUseCase`) + `<input type="checkbox" id="sansLicence">`. `buildHref` préserve les 2 nouveaux params dans la pagination.

R-30 — Wizard création licence 3 étapes

- Server Actions Phase 21 : `checkLicenceDoublonAction` (USER+, retourne `DoublonInfo[]` — chevauchement temporel non-strict via `listLicencesByClientUseCase` ACTIF + filter post-fetch ; pas de SQL dédié — simplicité), `addArticleAfterCreateAction` (ADMIN/SADMIN, helper boucle d'ajout articles).
- `licences/page.tsx` Server Component : pré-charge le catalogue (`listProduitsUseCase` + `listArticlesUseCase` actifs) en parallèle, le passe en props au wizard. Volume cible <50 produits / <500 articles : pas de pagination, filtrage client-side.
- `NewLicenceDialog.tsx` refacto multi-step (`useState<Step>` 1|2|3) :
  - Étape 1 : Client (`SearchableSelect`) + Entité (rechargée via `listEntitesForClientAction` quand client change) + dates + renouvellement auto.
  - Étape 2 : produits dépliables avec checkbox articles ; champ volume autorisé (entier ≥0) si `controleVolume=true`, sinon label « Illimité ». Validation : ≥1 article coché.
  - Étape 3 : résumé + warning doublon (interroge `checkLicenceDoublonAction` au passage step 3) + bouton « Créer » → `createLicenceAction` puis boucle `addArticleAfterCreateAction`. Création + ajouts articles **non-atomiques** (limitation acceptée — un échec partiel laisse une licence créée avec un sous-ensemble d'articles, complétable via `/licences/[id]/articles`).

`fix(article)` glissé en cours de Phase 21 : test `article.entity.spec.ts:52` rehydrate manquait `controleVolume` (dette Phase 19 R-13 — typecheck cassé latent, sans incidence runtime). Une ligne ajoutée.

**Phase 20 close (Mai 2026) — corrections post-tests R-24 → R-35** : 11 retours catalogués traités en 8 commits + 4 pré-commits fixes critiques.

Pré-commits (fixes critiques bloquants prod, identifiés en cours de Phase 20)

- `fix(error)` : `static typeName` sur AppError + 7 sous-classes — bug critique où Turbopack/Webpack minifiait `Class.name` en token court ('c'), faisant systématiquement échouer le check classe ↔ code en build prod ('Code SPX-LIC-XXX déclaré pour ConflictError, levé depuis [token court]'). 59/59 tests errors verts.
- `fix(ui)` toggle dark/light : `@variant dark (&:where(.dark, .dark *))` + bloc `:root.light` dans globals.css. Phase 18 R-02 incomplet — Tailwind v4 utilise media query par défaut, classe HTML sans effet. Logout via `onSelect` direct sur DropdownMenuItem (le pattern Radix `<form action>` imbriqué bloquait le submit).
- `fix(catalog)` : pattern HTML5 + auto-uppercase + helper text sur les inputs code Produit/Article (alignement avec ProduitCodeSchema Zod côté serveur — évite les ZodError opaques).
- `fix(infrastructure)` : purge-demo noms de tables réels — `lic_contacts` → `lic_contacts_clients`, retrait `lic_articles`/`lic_produits` (référentiels SADMIN à préserver, table réelle = `*_ref`).

R-24 — Flèches tabs masquées définitivement (CSS scrollbars natives)

- `[data-slot="tabs-list"]` : `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. Les flèches ▲▼ persistantes étaient en fait des scrollbars natives Chrome/Edge Windows sur les TabsList Radix avec `overflow-x-auto`. Phase 18 ne ciblait que les composants Radix (jamais activés). Scroll horizontal souris/trackpad/clavier conservé.

R-25/26/27 — Fiche client polish

- R-25 : bouton « Importer healthcheck » débloqué pour TOUTES les licences (pas seulement ACTIF). Cas réaliste : suivi historique sur licence SUSPENDU/EXPIRE. Le select interne affiche le statut entre parenthèses.
- R-26 : `<BrandLockup>` adaptatif au thème — prop `tone` désormais optionnelle, par défaut utilise les vars DS dynamiques (`text-foreground` / `text-muted-foreground` / `text-border`) qui flip via `:root.light`. Mode `tone='dark|light'` reste disponible pour les surfaces qui ne suivent pas le thème global.
- R-27 : ClientInfoTab résolution code → libellé via `paysByCode` / `deviseByCode` / `langueByCode` (Maps depuis listes propagées en props par le Server Component). Affichage 'Maroc (MA)' / 'Dollar australien (AUD)' / 'English (en)'.

R-28/31/32 — Fiche licence robustesse + édition volume

- R-28 : StatusDialog licence — helper `humanizeStatusError(err)` qui transforme les codes SPX-LIC-733/734/735 en messages français avec remediation.
- R-31 : GenerateLicFileButton — helper `humanizeError(err)` qui transforme les codes PKI SPX-LIC-411/412/413 en messages avec lien `/settings/sécurité`. Affichage `<p>` whitespace-normal au lieu de `<span>` pour ne pas tronquer.
- R-32 : EditVolumeDialog étendu pour éditer `volumeConsomme` (correction manuelle admin avant le prochain snapshot batch). Le champ `volumeAutorise` est masqué pour les articles `controleVolume=false`. Use-case backend déjà capable des 2 optionnels (Phase 6.C) — pas de modif port.

R-29 — Filtres clients enrichis + total count (partiel — Région/SansLicence livrés Phase 21)

- Port `ClientRepository.findPaginated` étendu (additif) : 3 filtres `codePays`/`accountManager`/`salesResponsable` + `total: number` dans output. Adapter sépare `businessConditions` (pour COUNT) de `pageConditions` (avec cursor).
- UI clients/page.tsx + ClientsTable : 3 nouveaux selects + 'N client(s) au total' dans subtitle. Préservation filtres dans buildHref pour pagination.

R-30 — Wizard création licence 3 étapes — **livré Phase 21** (cf. bloc Phase 21 ci-dessus).

R-33 — PDF logo + header pro

- `renderPdfHtml` refondu : `@page :running()` pour header répété + `@bottom-center` pour footer 'Page N/M · S2M SELECT-PX · Confidentiel'. Logo dégradé CSS inline (cyan-100 → cyan-500 → blue-900). Bandeau résumé `border-l cyan-500`. `thead { display: table-header-group }` + `tr { page-break-inside: avoid }` pour pagination tableau propre. Helvetica/Arial stack système.

R-34 — /settings/info simplifié

- Retiré 3 lignes 'Runtime Node', 'Plateforme', 'Stack'. Conservé Application/Version/Build SHA/Démarré/Uptime.

R-35 — Reload démo robuste après purge

- Wrapper `step(name, fn)` autour de chaque seed avec try/catch propageant `InternalError` SPX-LIC-900 + message contextualisé `Échec rechargement démo à l'étape "<name>" : <cause>`.
- 2 seeds Phase 18 ajoutés au pipeline reload (manquaient depuis Phase 17) : `phase8-alerts` + `phase10-fichiers`. Ordre strict respecté (FK).

**Phase 19 close (Mai 2026) — controle_volume articles + Chromium Docker** :

- **R-13 — `controle_volume` sur lic_articles_ref (cascade migration + 5 layers + UI + tests)** :
  - Migration 0014 : `ALTER TABLE lic_articles_ref ADD COLUMN controle_volume boolean DEFAULT true NOT NULL`. Idempotent via Drizzle Kit `_journal.json` (idx 14).
  - Domain `Article.entity.ts` : champ `controleVolume`, factory `create()` défaute à true, `rehydrate()` propage la valeur BD, `withControleVolume(b)` setter, `toAuditSnapshot()` étendu (7 champs).
  - Mapper + adapter Drizzle : `articlesRef.controleVolume` schema, `toEntity/toDTO/toPersistence` propagent ; `update()` repo écrit le champ.
  - Use-cases `CreateArticleUseCase` + `UpdateArticleUseCase` : input.controleVolume? optional (patch partiel pour update).
  - Schémas Zod `CreateArticleSchema` + `UpdateArticleSchema` : `controleVolume: z.boolean().optional()`.
  - UI `/settings/catalogues` (CataloguesPanel.tsx) : checkbox 'Contrôle de volume activé' (défaut coché) dans ArticleDialog ; badge 'Illimité' (amber 15%) à droite de uniteVolume dans ArticleRow si controleVolume=false.
  - UI `/licences/[id]/articles` (ArticlesTab.tsx) : pour articles fonctionnalité, vol consommé/autorisé affichés en `—` / `Illimité` italique, ratio en `—` (text-muted). AddArticleDialog : champ vol autorisé masqué si l'article sélectionné est non contrôlé (panneau info amber à la place).
  - Seed `phase6-catalogue.seed.ts` : 3 articles fonctionnalités marqués `controleVolume: false` (ATM-ADV, POS-ADV, SSV6-FRAUD). `applyControleVolumeOverrides(sql)` UPDATE idempotent post-INSERT pour aligner BD démo existante (pattern aligné Phase 18 R-20).
  - Tests : `article-crud.usecase.int.spec.ts` étendu (create avec controleVolume=false, update toggle true→false→true) ; `article.entity.spec.ts` toAuditSnapshot mis à 7 champs. **22/22 tests article verts**.

- **Chromium Docker pour puppeteer PDF export** :
  - Dockerfile base stage : `ENV PUPPETEER_SKIP_DOWNLOAD=true` — `pnpm install` ne télécharge plus le Chromium bundlé (~200MB).
  - Dockerfile runner-app stage : `apk add chromium nss freetype harfbuzz ca-certificates ttf-freefont` + `ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`. Puppeteer 23 lit cette env nativement à `launch()` — aucune modif TS reports/\_actions.ts.
  - Note : la spec utilisateur référençait `apt-get install` (Debian) ; adaptation à node:24-alpine via `apk` avec le même résultat fonctionnel.
  - `.env.example` : section Puppeteer documentée (commentée par défaut — non applicable en dev local).

**Phase 18 close (Mai 2026) — corrections post-tests utilisateur** : 23 retours catalogués (R-01 → R-23) traités en 8 commits.

- **Bloquants critiques** : R-05/R-01 (table `lic_volume_history` typo Phase 17 F2 → corrigé en `lic_article_volume_history` dans `purge-demo.ts` + `get-demo-stats.ts` ; refactor `safeCount` avec try/catch défensif → `/settings/demo` ne crash plus 500 si une table manque), R-19 (`.env` local Brevo SMTP — non commité ; SmtpPanel migré sur vars DS dark-mode pour résoudre les labels noir/noir).
- **Seed & data** : R-03 (`phase8-alerts.seed.ts` NEW — 3 alertes CDM/BIAT/CMI), R-22 (`phase10-fichiers.seed.ts` NEW — 2 fichiers démo .lic + .hc avec hash SHA-256), R-20 (régions DM corrects via UPSERT + nouvelle région PASS + override `account_manager` par pays via UPDATE post-INSERT). Bug latent Phase 17 corrigé : `phase8-notifications.seed.ts` `ORDER BY date_creation` → `created_at` (bloquait `pnpm db:seed` 1er run).
- **UX & affichage** : R-02 (toggle dark/light fonctionnel via `router.refresh()` après `setThemeAction`), R-04+R-18 (mentions « Phase X » et « règle LX » retirées des libellés UI + section « Crypto (Phase 3) » + champs « Clé AES » / « Nom application » / « SMTP configuré » retirés de `/settings/general`), R-06 (pays nom complet via `paysByCode` lookup côté ClientsTable), R-07 (bouton Eye lecture seule par row clients, Dialog avec infos DTO), R-08 (filtre statut « Tous » vérifié déjà conforme), R-09/R-10 (`listTypesContactUseCase.execute({}).catch(() => [])` — fallback gracieux), R-11 (palette `/licences` migrée DS dark, badges statut colorés), R-12 (bouton « + Nouvelle licence » + wizard Dialog 1 écran avec combobox client/entité, dates, commentaire — `createLicenceAction` + `listEntitesForClientAction`), R-14 (règle CSS défensive `[data-radix-scroll-area-scrollbar]` + `[data-radix-tabs-scroll-button]` masqués), R-15 (4 `loading.tsx` skeletons : clients/licences/renewals/notifications), R-16 (filtre priorité local + bouton « Archiver > 30j » via `archiveOldNotificationsAction` ADMIN), R-17 (`/audit` + `/batches` wrapped `<div className="p-6">`).
- **Features** : R-21 (exports XLSX via exceljs + PDF via puppeteer pour licences/renouvellements — lazy-importés, `serverExternalPackages: ["mjml","exceljs","puppeteer"]`, base64 sérialisation Server Action → blob download client), R-23 (section « Templates fichiers » dans `/settings/sandbox` avec 2 boutons download .lic + .hc — JSON structuré aligné `docs/integration/F2_FORMATS.md`).
- **R-13 (controleVolume article)** : initialement différé Phase 18, **résolu Phase 19** (cf. bloc Phase 19 ci-dessus) — migration 0014 + 5 layers + UI Catalogues + UI ArticlesTab + seed update + tests.

**Phase 17 close (Mai 2026) — refonte seed v1 + déblocage stubs + theme + demo tab** :

- D1-D6 : seed démo refondé sur données réelles v1 — 7 régions (NORD_AFRIQUE, AFRIQUE_FRANCOPHONE, AFRIQUE_ANGLOPHONE, ASIE, EUROPE, MOYEN_ORIENT, AUSTRALIE) + 22 pays Excel v1 + équipe 10 membres + catalogue 10 produits/31 articles S2M réels (SPX-CORE/SPX-SWITCH/SPX-ACQ/SPX-ISS/SSV6-\*) + 100% des licences avec 2-3 articles + 10 notifications démo.
- S1-S4 : 4 stubs débloqués — `/history` redirect vers `/audit`, `/files` vue cross-licence (port `findAllRecent`, use-case `ListAllFichiersUseCase`), `/volumes` cross-clients (filtres client/article/période + lien `/licences/[id]/articles`), `/alerts` CRUD ADMIN+ branché sur use-cases `alert-config` (port `findAll` + use-case `ListAllAlertConfigsUseCase`).
- F1 : toggle dark/light cookie `spx-lic.theme` (Server Action `setThemeAction` + `_theme.ts` séparé pour types/const, ThemeToggle dans AppHeader, lecture root layout).
- F2 : `/settings/demo` SADMIN — purge (TRUNCATE 16 tables métier préservant users/référentiels) + reload (réexécute pipeline seed) + compteurs live + audit DEMO_PURGED/RELOADED.
- U1-U4 : header padding cohérent, colonnes licences vérifiées, spinners `<input type="number">` masqués, defaults SMTP grisés en italique.
- Build fix `serverExternalPackages: ["mjml"]` — résout EBADF Next 16/Turbopack au "Collecting page data".

**Audit Master Référentiel reçu Mai 2026** : alignement v2.0 → v2.1 livré Phase 15. 3 corrections critiques (redaction PII pino, ADR application→infrastructure/db, sync docs) + 4 importantes (split /api/health en /live + /ready, archive audits par phase, port PasswordHasher, liste configs Stop validate) + 1 mineure (brute-force lockout).

**Phase 16 close (Mai 2026) — clôture totale dettes** : 8 dettes résiduelles fermées en une passe :

- **DETTE-LIC-018** + **019** (BD test isolation) : `setupTransactionalTests` étendu avec option `cleanTables` (TRUNCATE intra-tx, rollback-safe). 6 specs migrées (5 pays + 1 langues + 1 team-members). **22 fails → 0 fails**.
- **DETTE-LIC-015** (i18n PKI) : ~50 clés FR/EN ajoutées sous `settings.security.*` + `settings.sandbox.*`, 4 composants convertis.
- **DETTE-LIC-016** (tests PKI dual-mode) : 3 tests créés couvrant CA présente/absente/atomic-with-contacts.
- **DETTE-LIC-009** (breadcrumb dynamique) : `EntityNameContext` Provider/Setter pattern, "Clients › Bank Al-Maghrib › Info" au lieu de "Clients › Détail › Info".
- **DETTE-LIC-011** (allocateNextReference race) : migration 0013 `CREATE SEQUENCE lic_licence_reference_seq` + `nextval()` atomique, R-41 capitalisée.
- **DETTE-LIC-013/014** (dropdowns 200) : composant `SearchableSelect` (combobox client-side) câblé sur 2 endpoints.
- **DETTE-LIC-022** (audit lectures sensibles) : 4 actions ajoutées (`CLIENT_READ`, `FICHIER_LOG_READ`, `EXPORT_CSV_LICENCES`, `EXPORT_CSV_RENOUVELLEMENTS`) — pattern best-effort try/catch.
- **DETTE-LIC-021** (MFA TOTP) : volontairement différée Phase 17+ avec **plan définitif figé** dans §10 (module hexagonal + migration 0014 + flow enrôlement + 6 audits).
- **DETTE-LIC-020** (PDF Référentiel v2.1) : reste ouverte (PDF non encore publié officiellement, placeholder en place).

**Phase 14 close (Mai 2026)** — clôture des vraies dettes pré-prod.

- Chantier A — DETTE-LIC-008 réelle (PKI `.lic` + healthcheck `.hc`) : `generateLicenceFichierUseCase` accepte `options.appMasterKey` → signe le contentJson via clé privée client (RSA-PKCS1-v1_5 + SHA-256) et embarque le cert client selon ADR-0002 (séparateurs `--- SIGNATURE S2M ---` / `--- CERTIFICATE S2M ---`). `importHealthcheckUseCase` accepte `settingRepository` → déchiffre via `lic_settings.healthcheck_shared_aes_key` (AES-256-GCM symétrique, throw 411 si absente, 402 si tag mismatch). Seed génère la clé partagée. ADR-0019 §10. Tests : 3 PKI + 3 AES (`fichier-log/__tests__/`). Ports `clientRepository.findClientCredentials` ajouté.
- Chantier B — DETTE-003 (module email) : module hexagonal `email/` avec `EmailMessage` (validation), port `EmailSender`, adapters `EmailSenderSmtp` (nodemailer) et `EmailSenderConsole` (Pino logs simulés), `TemplateRendererMjml` (5 templates : password-reset, password-changed, user-welcome, licence-expiring, volume-threshold). Composition root sélectionne smtp vs console selon `env.SMTP_HOST`. Intégrations best-effort dans `createUserAction` (welcome) et `resetUserPasswordAction` (mot de passe temp) — échec email ne bloque pas la mutation. UI `/settings/smtp` réelle avec statut + bouton "Tester l'envoi" SADMIN. Codes SPX-LIC-800..802. Tests : 7.
- Chantier C — DETTE-LIC-006 (UI Edit 6 référentiels) : 6 Server Actions `update*Action` + composant générique `RefEditDialog` (factorisé) câblé dans les 6 sous-onglets `/settings/team` (Régions, Pays, Devises, Langues, Types contact, Équipe). Bouton "Modifier" par row → dialog pré-rempli + submit → revalidatePath. Selecteurs immuables (codeISO/id) désactivés dans le formulaire.
- Chantier D — DETTE-LIC-017 (contacts à création client) : `createClientUseCase` accepte `input.contacts` (max 5) + `contactRepository` injecté. Persistance atomique client + Siège + N contacts dans la même `db.transaction` avec audit `CONTACT_CREATED` par contact (règle L3). Schéma Zod `CreateClientSchema.contacts` ajouté. UI `ClientDialog` mode create : section dynamique "Contacts (Siège)" avec ajout/retrait jusqu'à 5 (typeContact, nom, prénom, email, téléphone). Tests : 3 nouveaux (contacts OK, rollback FK invalide, sans contacts inchangé).

**Tickets UX post-Phase-3 (Mai 2026)** — corrections et améliorations UX issues de la revue post-livraison, sans nouvelle phase métier.

- T-01 (commit `9667c10`) : `ClientDialog` enrichi — selects référentiels SADMIN (pays/devise/langue) + selects team-members SALES/AM (volet A) au lieu d'`<Input>` libres + section contacts read-only en mode edit avec lien vers la page CRUD dédiée. DETTE-LIC-017 ouverte (embedded edit contacts différé).
- T-02 (commit `2c4548e`) : 6 KPI cards Dashboard cliquables (`/clients?statut=ACTIF`, `/licences?statut=ACTIF|EXPIRE|SUSPENDU`, `/renewals?statut=EN_COURS`, `/notifications?lu=false`). Card `licencesSuspendues` ajoutée à la grille (était absente du rendu malgré la valeur déjà calculée par `getDashboardStatsUseCase`).
- T-03 (commit `3610bf3`) : page `/licences` globale réelle (anciennement stub Phase 5) — vue cross-clients avec filtres GET (`statut`, `q` recherche reference ILIKE), pagination cursor, lien Détail par ligne, colonne Client résolue post-fetch. Use-case `listAllLicencesUseCase` + extension port `findPaginated.q?`.
- T-04 (commit `018e6fe`) : `/settings/smtp` libellé "Non implémenté (SMTP)" au lieu de "Disponible Phase 8". `PhaseStub.phase` accepte `null` (clé i18n `notImplemented`).
- T-05 (pas de commit) : catalogues vides — investigation environnementale, `pnpm db:seed` relancé (5 produits + 15 articles + 55 clients + 55 licences). Pas de bug applicatif.
- T-06 (commit `7b643b7`) : i18n onglet `settings.tabs.team` "Équipe" → "Référentiels" / "Team" → "References" (la route reste `/settings/team`, seul le label affiché change).
- F-13 fix (commit `db5488f`) : afterAll TRUNCATE+reseed sur les 3 specs crypto qui touchent `lic_settings` — élimine la régression du test `update-settings.usecase.int.spec.ts > payload vide est un no-op` causée par les nouveaux tests d'intégration Phase 3.C/3.E.
- Sidebar fix : 4 routes orphelines (`/volumes`, `/alerts`, `/files`, `/history`) ré-ajoutées dans `nav-routes.ts` (anciennement retirées Phase 11.C). Pages stub passées en `<PhaseStub phase={null}>` stylé DS au lieu de placeholder texte. `/settings/demo` aussi en `phase={null}` (anciennement Phase 4).

**Phase 3 PKI close (Mai 2026)** — module crypto + CA + cert clients + sandbox + endpoint public.

**Phase 3 PKI close (Mai 2026)** — module crypto + CA + cert clients + sandbox + endpoint public.

- 3.A.1 (commits `c6a8f59`, `a1477ff`) : retrait node-forge + module crypto/domain/rsa.ts (RSA-4096 + RSASSA-PKCS1-v1_5 RFC8017) + 21 tests + vecteur de non-régression. ADR-0019.
- 3.A.2 (commits `c178a8a`, `07c75a9`) : aes.ts (AES-256-GCM NIST SP800-38D) + x509.ts (CA + client cert generation via @peculiar/x509, vérification sync via node:crypto.X509Certificate). 41 tests crypto.
- 3.B : migration 0010 — 3 colonnes PKI nullable sur `lic_clients` (`client_private_key_enc`, `client_certificate_pem`, `client_certificate_expires_at`) + index `idx_clients_cert_expires_at`.
- 3.E.0 : migration 0011 — ALTER TYPE audit_mode ADD VALUE 'SCRIPT' pour backfill + scripts pnpm one-shot.
- 3.C : `generateCAUseCase` + `getCAStatusUseCase` + `getCACertificateUseCase` câblés cross-module (settingRepository + auditRepository + userRepository) + UI `/settings/security` (statut CA, génération SADMIN, téléchargement `s2m-ca.pem`). CA persistée en JSONB unique sous clé `s2m_root_ca`.
- 3.D : refactor `createClientUseCase` — vérif CA présente AVANT tx (throw SPX-LIC-411 si absente), génération paire RSA-4096 client + cert X.509 signé par CA + chiffrement AES-GCM clé privée + INSERT cert dans même tx que client + audit `CERTIFICATE_ISSUED`. Constructor avec `settingRepository?` optional pour rétrocompat tests legacy.
- 3.E : `backfillClientCertificatesUseCase` itère clients sans cert, génère cert pour chacun (audit mode SCRIPT). Script CLI `pnpm script:backfill-client-certs`. UI section dans `/settings/security`.
- 3.F : Sandbox `/settings/sandbox` opérationnelle — 5 outils SADMIN (génération paire RSA, signature .lic, vérification, chiffrement .hc, déchiffrement) — règle L16 respectée (ZÉRO écriture BD, tout en mémoire).
- 3.G : route `/.well-known/s2m-ca.pem` (404 silencieux par défaut, 200 + PEM si setting `expose_s2m_ca_public=true`). Toggle SADMIN. Var d'env `EXPOSE_S2M_CA_PUBLIC` supprimée → setting BD single source of truth.
- 3.H : ADR-0019 (RSA-4096, node:crypto natif, @peculiar/x509 exception, PKCS1-v1_5, validity 20/10 ans, AES-GCM, toggle BD, audit_mode SCRIPT). DETTE-LIC-008 résolue.

**Phases 1 → 13 closes (Mai 2026)** — back-office complet livré + durcissement sécurité prod.

**Phase 13 close (Mai 2026)** — durcissement sécurité, perf, déploiement, doc finale.

- 13.A — sécurité prod : rate limit helper in-memory (`infrastructure/rate-limit/`) appliqué à `change-password` (5/min/user) et `reset-password` (10/min/admin), code SPX-LIC-904 — commit `d74154d`. CSP **Variante A+nonces** production-only via `app/src/proxy.ts` Next.js 16 (NODE_ENV !== 'production' guard) + ADR 0018, **DETTE-LIC-004 résolue** — commit `2b8fc3c`. Headers F-15 conservés (HSTS, X-Frame-Options DENY, etc.).
- 13.B — perf : 64 indexes BD validés (couverture lectures FTS audit + rapports + dashboard), build green, `/api/health` opérationnel — pas de modif Phase 13.
- 13.C — dettes : `BUILD_SHA` injecté en CI (`.github/workflows/ci.yml`), DETTE-LIC-007 résolue. Test `toggle-type-contact.usecase.int.spec.ts` refactor TRUNCATE+reseed (R-32) pour fixer la flakiness cross-files (la table bootstrap `lic_types_contact_ref` était TRUNCATEd par d'autres specs CASCADE) — commit `7f4d27c`.
- 13.D — doc : `README.md` statut final phases 1-12 puis 1-13 — commits `a4a7297` + commit final cloture.
- 13.E — déploiement : `Dockerfile` multi-stage (base/deps/builder/runner-app/runner-worker, non-root uid 1001, ARG BUILD_SHA, healthcheck `/api/health`) + `.env.example` enrichi (section BUILD_SHA) — fichiers livrés, test build container reporté à la step préprod.

**Phases 11+12 closes (Mai 2026)** — Dashboard EC-01 + Rapports EC-09 + Profil EC-14.

- 11.A (commit `50e0245`) : module dashboard (port + adapter + use-case agrégats SQL) + page `/` avec 5 KPI cards + 4 graphiques recharts + 2 tableaux rapides
- 11.B (commit `bfa3a8c`) : page `/reports` ADMIN/SADMIN + 3 exports CSV (licences, renouvellements, audit) cap 100k lignes via SPX-LIC-755
- 11.C (commit `5c9ee9b`) : nav-routes nettoyé (4 routes orphelines retirées) + breadcrumbs dynamiques `/clients/[id]/*` et `/licences/[id]/*` (DETTE-LIC-009 partielle)
- 12.A (commit `1ae5597`) : page `/profile` (infos user + lien change-password + warning mustChange)
- 12.B : flow force-change-password déjà opérationnel depuis Phase 2.A (`requireAuthPage` redirige vers `/change-password` si `mustChangePassword=true`)

**Phase 6 Catalogue + Volumes close (Mai 2026)** — 5 modules hexagonaux (produit, article, licence-produit, licence-article, volume-history) + UI tab articles licence + onglet catalogues settings + seed démo.

- 6.A (commit `46cbe5c`) : 5 schémas Drizzle + migration 0007 (10 indexes + 5 FKs + 4 CHECK volumes ≥0 + 4 UNIQUE)
- 6.B (commit `4bfeb3e`) : modules produit + article (PK serial ADR 0017, R-27 sans audit), 10 use-cases, 43 tests
- 6.C (commit `d958bc3`) : modules licence-produit + licence-article (audit transactionnel L3), Add/UpdateVolume/Remove
- 6.D (commit `0fe715e`) : module volume-history append-only avec cursor pagination + R-35 isUniqueViolation
- 6.E (commit `bc81e98`) : seed démo (5 produits + 15 articles + 20 licences attachées + 60 snapshots, idempotent SEED)
- 6.F (commit `c5466a3`) : UI tab `/licences/[id]/articles` + onglet `/settings/catalogues` + 11 Server Actions + i18n FR/EN

**Phase 5 Licences close** (commits `e348406` → `69610af`) : 2 modules + 4 tabs détail + seed 55 licences.

**Phase 4 EC-Clients close** (commits `b5906c4` → `f2c273e`) : 3 modules + UI liste/détail + seed 55 clients.

**Phase actuelle précédente** : **Phase 2.B + Phase 2.B.bis EC-08 Users complètes (Mai 2026)** — écran EC-13 Paramétrage opérationnel (4 onglets réels + 5 PhaseStub), 462/462 tests verts.

- Étape 1/7 : 6 schémas Drizzle référentiels SADMIN + migration bootstrap idempotente + **ADR 0017** (PK serial, exception bornée à ADR 0005).
- Étapes 2-4/7 : 6 modules hexagonaux complets (regions, pays, devises, langues, types-contact, team-members) — 30 use-cases, exclus de l'audit obligatoire (R-27, ADR 0017).
- Étape 5/7 (commit `5ab9392`) : composition-root cross-module + script `pnpm db:seed` enrichi (8 régions, 31 pays, 15 devises, 5 langues, 6 types contact, 6 team members, 5 users BO, 9 settings — DEV-only) + R-29 (isolation seed vs tests).
- Étape 6/7 (commit `73edc08`) : layout `/settings` + 9 onglets (3 réels + 6 PhaseStub) + i18n FR/EN + R-30 (Tabs shadcn asChild+Link).
- Étape 7/7 (commit `95496c8` + fix `6e148be`) : module settings hexagonal + onglets general/team/info opérationnels + 13 Server Actions SADMIN + R-31 (DTOs app-route dupliqués).
- **Phase 2.B.bis EC-08 Users (commit `b51195a`)** : module user hexagonal complété (domain/entity/errors/password + 5 use-cases list/create/update/toggle/reset + mapper) + 15 tests (TRUNCATE+reseed pattern R-28) + UI `/settings/users` réel (SettingsUsersTable + UserDialog + PasswordRevealDialog verrouillé Radix + ConfirmResetPasswordDialog) + 4 Server Actions SADMIN + log Pino `user_password_to_communicate` + codes SPX-LIC-720..723 + audit USER\_\* (CREATED/UPDATED/ROLE_CHANGED/ACTIVATED/DEACTIVATED/PASSWORD_RESET_BY_ADMIN). Onglet `users` retiré des stubs : 5 PhaseStub restants (security, smtp, catalogues, sandbox, demo).

**Phase 2.A close** : 10/10 fondations F-01 à F-12 (commit `cc310e7`). **Phase 2.A.bis — Alignement Référentiel v2.1 (Mai 2026)** : ADR 0009 (Variante B), CI GitHub Actions bloquante (F-14), headers HTTP de sécurité §4.16 (F-15).

**Référence amont** : LIC v1 (repo Git interne S2M, accessible sur l'organisation S2M) en production avec 11 sprints livrés, ~445 tests verts. Sert de **référence fonctionnelle** uniquement (besoins métier, écrans, workflows). LIC v2 n'est **pas une migration** : c'est un projet greenfield.

### Phase 1 — Bootstrap (prochain jalon)

1. Init monorepo pnpm (workspaces `app/` + `shared/`)
2. Stack qualité : Vitest + Playwright + ESLint+Prettier + `eslint-plugin-boundaries` + Husky + gitleaks + commitlint + release-please
3. Docker Compose local (PostgreSQL 18 + portail dev)
4. CLAUDE.md racine + sous-dossiers + Makefile (commandes Référentiel §4.10)
5. Schéma BD initial (Drizzle 0.45) avec `lic_settings`, `lic_users`, `lic_audit_log`
6. Auth.js v5 sessions + middleware
7. Layout shadcn/ui + tokens DS SELECT-PX (`@theme` Tailwind 4) + 1 page d'accueil minimale

### Phases suivantes (indicatif, à affiner par cadrage de phase)

- **Phase 2.B** : référentiels SADMIN (catalogues + équipe) + écran `/settings`
- **Phase 3** : crypto PKI (CA + certifs clients + sandbox)
- **Phase 4** : domaine clients/entités/contacts (EC-Clients)
- **Phase 5** : domaine licences (EC-02, EC-03, wizard EC-03c)
- **Phase 6** : articles + volumes (EC-04) + jobs snapshot
- **Phase 7** : audit + journal (EC-06 avec FTS)
- **Phase 8** : alertes + notifications + jobs (EC-07, EC-10)
- **Phase 9** : renouvellements (EC-11)
- **Phase 10** : fichiers (génération `.lic`, healthcheck dry-run, EC-Files)
- **Phase 11** : rapports (EC-09) + dashboard (EC-01)
- **Phase 12** : supervision batchs (EC-12) + profil (EC-14)
- **Phase 13** : durcissement, perf, déploiement

---

## 3. Stack technique

**Stack alignée Référentiel §1**, avec adaptations propres à LIC v2 (consignées en ADR).

### Imposé par le Référentiel (LIC v2 s'aligne)

- Node.js **24 LTS**, TypeScript **6.0.3** strict, ESM, target ES2025
- Next.js **16.2.4 LTS**, React **19.2**, Tailwind CSS **4.2.4 LTS**
- PostgreSQL **18.3** + Drizzle ORM **0.45.2** + Drizzle Kit
- Zod **4.3.6**, Pino **10.3.1**
- Vitest **2.1+**, Playwright **1.48+**
- ESLint + Prettier (config attendue `@s2m/eslint-config`), Husky + lint-staged + gitleaks
- shadcn/ui, TanStack Query **5.51+**, React Hook Form **7.52+**, Recharts **2.13+**
- next-intl **4.x** (FR + EN par défaut, extensible)
- Polices DS SELECT-PX via `next/font/google` : **Montserrat 800**, **Poppins 300/500**, **JetBrains Mono**

### Adaptations LIC v2 (vs Référentiel)

| Brique Référentiel                  | Choix LIC v2                                                                           | ADR      |
| ----------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| NestJS 11 backend séparé            | **Next.js full-stack single-app** (Server Actions = controllers)                       | 0001     |
| Redis 7 (locks, cache, idempotence) | **Aucun** — non nécessaire en mono-tenant                                              | implicit |
| NATS JetStream 2.10 (events)        | **Aucun** — pas de bus inter-service                                                   | implicit |
| `decimal.js` (montants)             | **Aucun** — LIC manipule des entiers de volumes (`number` validés `.int().positive()`) | implicit |
| Flyway (migrations)                 | **Drizzle Kit** — déjà l'ORM imposé                                                    | implicit |
| JWT access mémoire + refresh cookie | **Auth.js v5 sessions cookies** — interne mono-tenant                                  | implicit |
| Multi-tenant (RLS + `tenant_id`)    | **Aucun** — mono-tenant par construction                                               | implicit |
| Outbox NATS                         | **Aucun** — INSERT directs en transaction                                              | implicit |

### Spécifique LIC v2

- **pg-boss 9+** : jobs planifiés dans Postgres (pas de Redis = pas de Bull/BullMQ)
- **node-forge 1.3+** : PKI (CA auto-signée + certificats X.509 clients) — cf. ADR 0002
- **nodemailer 6.9+** + **MJML 4.15+** : emails transactionnels
- **Puppeteer** : génération PDF (rapports)
- **ExcelJS 4.4+** : génération Excel (rapports)
- **bcryptjs 2.4+** : hash mots de passe (cost 10)

---

## 4. Architecture

### Choix structurel

LIC v2 est **un seul projet** Next.js 16 qui contient frontend (App Router, Server Components) **et** backend (Server Actions, modules métier hexagonaux, jobs pg-boss dans worker séparé).

**Justification** dans `docs/adr/0001-architecture-single-app-nextjs.md`.

### Hexagonal strict (alignement Référentiel §3, §4.2, §4.11)

Le pattern `domain → application → ports → adapters` est **respecté à la lettre**. Les Server Actions Next.js remplacent les controllers NestJS du Référentiel.

| Couche Référentiel      | Équivalent LIC v2                                                     | Règle                                                                       |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `domain/`               | `app/src/server/modules/<X>/domain/`                                  | Pure functions + entités. Aucune dépendance hors TS et types `shared/`.     |
| `application/`          | `app/src/server/modules/<X>/application/`                             | Use-cases. Orchestrent transactions + ports + audit. Pas de Drizzle direct. |
| `ports/`                | `app/src/server/modules/<X>/ports/`                                   | `abstract class` (templates §4.12.2 du Référentiel).                        |
| `adapters/postgres/`    | `app/src/server/modules/<X>/adapters/postgres/`                       | Drizzle. Aucune règle métier.                                               |
| `controllers/` (NestJS) | Server Actions Next.js dans `app/src/app/(dashboard)/<X>/_actions.ts` | Validation Zod + appel use-case + `revalidatePath`. Aucune logique métier.  |
| `shared/schemas/`       | `shared/src/schemas/` (workspace pnpm dédié)                          | Source de vérité contrats UI ↔ serveur.                                     |

### Vérifications automatiques

- **`eslint-plugin-boundaries`** (Référentiel §4.2) : casse le build si dépendance illicite
- **gitleaks** pre-commit : casse le commit si secret détecté
- **`tsc --noEmit`** + **`vitest run`** + **`playwright test`** dans CI

### Cohérence transactionnelle

- ACID **à l'intérieur** d'une transaction PostgreSQL uniquement
- Pattern : Server Action → use-case → transaction → repository writes + `auditLog.record()` → commit → `revalidatePath()`
- **Optimistic locking** sur `lic_licences` (colonne `version`) — cf. règle L4 section 6
- Pas d'outbox NATS — notifications post-mutation = INSERT directs dans `lic_notifications` même transaction

### Worker pg-boss

- Process séparé (`pnpm worker:dev`, container Docker dédié en prod)
- 5 jobs (cf. section 8.5)
- Trace dans `lic_batch_executions` + `lic_batch_logs` (UI EC-12 lit ces tables, pas pg-boss interne)

### Communication frontend ↔ backend

- **100% Server Actions** pour mutations
- **Server Components** pour lectures initiales (cache `revalidate` configurable par route)
- **TanStack Query** uniquement pour interactions client lourdes (édition inline, polling supervision, recherche live)
- **Aucun fetch direct** depuis composants — toujours via hooks `app/src/hooks/queries/`
- **Pas d'API REST publique** sauf 2 endpoints minimaux : `/api/health` et `/.well-known/s2m-ca.pem` (toggle SADMIN)

---

## 5. Structure du dépôt

Adaptation de la structure Référentiel §3 pour single-app Next.js.

```
s2m-lic/
├── package.json                pnpm workspace root
├── pnpm-workspace.yaml         ["app", "shared"]
├── tsconfig.base.json
├── .nvmrc                      24
├── .editorconfig
├── .env.example
├── Makefile                    cibles standardisées Référentiel §4.10
├── docker-compose.yml          PG 18 local
├── README.md
├── CLAUDE.md                   ≤300 lignes (Référentiel §4.19)
├── PROJECT_CONTEXT_LIC.md      Ce document
│
├── app/                        ◀ workspace Next.js (frontend + backend)
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── CLAUDE.md               règles spécifiques workspace app
│   └── src/
│       ├── app/                ◀ Next.js App Router
│       │   ├── (auth)/         /login, /forgot-password, /reset-password
│       │   ├── (dashboard)/    layout sidebar+header, 14 écrans (cf. section 8)
│       │   │   ├── clients/_actions.ts        ◀ Server Actions co-localisées
│       │   │   ├── licences/_actions.ts
│       │   │   └── ...
│       │   ├── api/health/route.ts
│       │   ├── api/.well-known/s2m-ca.pem/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css     @theme tokens SELECT-PX
│       ├── server/
│       │   ├── modules/        ◀ UN DOSSIER PAR BOUNDED CONTEXT
│       │   │   └── <domain>/
│       │   │       ├── domain/         entités + règles pures + tests
│       │   │       ├── application/    use-cases + tests
│       │   │       ├── ports/          abstract classes
│       │   │       ├── adapters/postgres/
│       │   │       └── <domain>.module.ts    composition root (DI manuelle)
│       │   ├── infrastructure/
│       │   │   ├── db/         pool postgres + drizzle() + schema/ + migrations/
│       │   │   ├── auth/       Auth.js v5 + helpers requireAuth/requireRole
│       │   │   ├── logger/     Pino (Référentiel §4.2 — pas de console.log)
│       │   │   ├── env/        validation Zod variables d'env
│       │   │   └── observability/  OpenTelemetry SDK
│       │   └── jobs/           worker pg-boss (5 jobs)
│       ├── components/         ui/ (shadcn) + brand/ + domain/ + shared/
│       ├── hooks/              queries/ (TanStack) + domain/ (mapping DTO)
│       ├── lib/                couche frontend (api/, domain/, brand.ts, auth.ts)
│       └── i18n/               config + messages/{fr.json, en.json}
│
├── shared/                     ◀ workspace pnpm contrats UI ↔ serveur
│   ├── package.json
│   └── src/
│       ├── schemas/            Zod (source de vérité)
│       ├── types/              z.infer<>
│       ├── constants/          codes erreur SPX-LIC-NNN, devises
│       └── index.ts
│
├── deploy/
│   └── docker/
│
└── docs/
    ├── design/                 ◀ DS SELECT-PX local
    │   ├── index.html          tokens, brand, install
    │   └── gallery.html        8 templates de référence
    ├── adr/                    Architecture Decision Records (§9)
    ├── integration/
    │   └── F2_FORMATS.md       spec format binaire .lic + .hc + snippets
    └── architecture.md         vue d'ensemble (renvoi vers ADR)
```

**Notes** :

- Modules backend **interdits** d'avoir `services/`, `helpers/`, `utils/`, `lib/`, `common/`, `managers/` (Référentiel §4.11)
- `app/src/lib/` **autorisé** à la racine du frontend (convention Next.js standard, exception §4.11)
- CLAUDE.md à 4 niveaux : racine + `app/` + par module backend si pertinent + `docs/`

---

## 6. Règles spécifiques LIC v2

> Les **règles transverses** (no `any`, no `console.log`, hexagonal strict, audit obligatoire, validation Zod, etc.) sont dans le **Référentiel §4.2 et §4.6**. Elles ne sont pas répétées ici.
>
> Cette section liste **uniquement les règles propres à LIC v2** qui s'ajoutent au Référentiel.

| #       | Règle                                                                                                                                                          | Justification                                                                                             |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **L1**  | **Mono-tenant** : pas de colonne `tenant_id`, pas de RLS, pas de `@CurrentTenant()`.                                                                           | Portail interne S2M. Annule les exigences §4.2 multi-tenant du Référentiel.                               |
| **L2**  | **Volumes = entiers** : `numeric(12,0)` côté BD, `number` côté TS validé `.int().positive()` avec Zod. **Pas de `decimal.js`**.                                | LIC manipule des compteurs (TPE, GAB, porteurs), pas de monnaie. Annule l'exigence §4.2 montants Decimal. |
| **L3**  | **Audit obligatoire** : toute mutation métier appelle `auditLog.record()` dans la même transaction (entité + action + before/after JSONB + user + ip + mode).  | Réglementaire + traçabilité. Implémente §4.2 audit du Référentiel pour LIC.                               |
| **L4**  | **Optimistic locking** sur `lic_licences` via colonne `version` (incrémentée à chaque UPDATE, vérifiée par `WHERE id=? AND version=?`).                        | Modifications concurrentes par plusieurs ADMIN.                                                           |
| **L5**  | **Soft delete** sur `lic_clients`, `lic_licences`, `lic_users` : `actif = false` ou `status = INACTIF`.                                                        | Préservation historique + audit.                                                                          |
| **L6**  | **userId = `'SYSTEM'`** pour toute action déclenchée par un job.                                                                                               | Distinction MANUEL/JOB dans audit.                                                                        |
| **L7**  | **Référence licence** : format `LIC-AAAA-NNN` (compteur séquentiel par année).                                                                                 | Identifiant lisible humain.                                                                               |
| **L8**  | **Stockage UTC** (`TIMESTAMPTZ` Référentiel §4.16). **Format date UI** : JJ/MM/AAAA en FR, DD/MM/YYYY en EN. Conversion fuseau locale **frontend uniquement**. | Cohérence i18n.                                                                                           |
| **L9**  | **Affichage utilisateur** : toujours **"Prénom NOM (MAT-XXX)"**, jamais matricule seul.                                                                        | Lisibilité humaine (acquis sprint 9 N-001).                                                               |
| **L10** | **Logs Pino structurés** : champs `userRef` (matricule) + `userDisplay` (rendu UI) séparés. Pas de matricule en clair dans le message.                         | Lisibilité logs prod.                                                                                     |
| **L11** | **Permissions vérifiées côté serveur ET côté UI**, jamais uniquement UI. Server Actions valident le rôle via `requireRole()`.                                  | Sécurité.                                                                                                 |
| **L12** | **Filtres URL toujours optionnels** : helper `optionalIdFromQuery`, enums `.catch("all")`. Une valeur invalide = pas de filtre, jamais d'erreur.               | UX robuste (acquis sprint 2 R-001).                                                                       |
| **L13** | **Tokens dates virtuels safe** : `now+Nd`, `now-Nd`, `end_of_month`. Parsés côté serveur avec fallback silencieux.                                             | UX robuste (acquis sprint 2 R-007).                                                                       |
| **L14** | **Forbidden gracieux** : redirection vers `/` ou page 403, jamais crash 500. Helpers `requireAuthPage` / `requireRolePage`.                                    | UX robuste (acquis sprint 2 R-008).                                                                       |
| **L15** | **Healthcheck dry-run obligatoire** : import en 3 étapes (Upload → Preview → Confirm/Cancel). Aucune mutation BD avant confirmation explicite ADMIN+.          | Sécurité métier critique (acquis sprint 10 lot 12A).                                                      |
| **L16** | **Sandbox SADMIN sans persistance** : `/settings/sandbox` génère/déchiffre fichiers test sans écrire dans `lic_fichiers_log` ni `lic_audit_log`.               | Tests crypto sans pollution audit.                                                                        |

---

## 7. Briques `@s2m/core-*` — implémentation locale (LIC v2 pilote)

LIC v2 implémente **localement** les briques transverses Référentiel (Annexe A). Quand mature, elles seront extraites en packages npm internes.

| Brique Référentiel                       | Implémentation locale LIC v2                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@s2m/core-errors`                       | `app/src/server/modules/error/` — classes typées + codes `SPX-LIC-NNN`                           |
| `@s2m/core-audit`                        | `app/src/server/modules/audit/` — `auditLog.record()`                                            |
| `@s2m/core-observability`                | `app/src/server/infrastructure/logger/` (Pino) + `observability/` (OTel)                         |
| `@s2m/core-crypto`                       | `app/src/server/modules/crypto/` — CA + certifs X.509 + AES-GCM                                  |
| `@s2m/core-validate`                     | `shared/src/schemas/` (Zod) + helpers infrastructure                                             |
| `@s2m/core-auth`                         | `app/src/server/infrastructure/auth/` (Auth.js v5 sessions, pas JWT)                             |
| `@s2m/core-tenant`                       | **N/A** mono-tenant                                                                              |
| `@s2m/core-idempotency`                  | **N/A** phase 1, à voir si besoin futur (en table BD si oui)                                     |
| `@s2m/core-redis`, `@s2m/core-comm-nats` | **N/A**                                                                                          |
| `@s2m/select-px-design`                  | DS local dans `docs/design/` (extrait dans `@theme` Tailwind 4 + composants `components/brand/`) |

**Règle de remontée** : quand une brique est mature (utilisée 2+ fois dans LIC, API stable, tests >80%), extraction en package npm interne via PR dédiée — juste un changement d'`import`.

---

## 8. Périmètre fonctionnel

### 8.1 Hiérarchie d'entités

```
CLIENT (groupe bancaire ou institution — ex: Attijariwafa Group)
  └── ENTITE (filiale — ex: Attijariwafa Sénégal)
        └── LICENCE (contrat avec dates et version — ex: LIC-2025-001)
              ├── PRODUIT (offre commerciale — ex: SPX Acquiring Suite)
              │     └── ARTICLE (composant facturable — ex: ATM Management std, POS Server)
              │           ├── a_volume = true  → vol_contractuel + consommation suivie
              │           └── a_volume = false → simple présence/activation
              └── RENOUVELLEMENT (workflow vers une nouvelle licence)
```

### 8.2 Acteurs (3 rôles)

| Rôle       | Profil                   | Capacités                                                                                   |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| **USER**   | Commerciaux, support     | Consultation. Aucune écriture.                                                              |
| **ADMIN**  | Account Managers, Sales  | Édition métier complète sauf admin système.                                                 |
| **SADMIN** | Équipe finance/admin S2M | Tout ADMIN + valide renouvellements + paramètres système (settings, utilisateurs, sandbox). |

### 8.3 Les 14 écrans cible v2

> **Cible v2 = v1 + 7 améliorations validées** (voir ADR 0011-0016 et fonctionnel) :
> A1: EC-08 Users dans Settings · A2: EC-Files unique source vérité · B: détail licence 4 tabs · C: wizard 3 étapes · D: dashboard widgets sparkline · E: notifications drawer+page · F: renouvellements drawer · G: ADR au lieu de DEC

| #   | Route                                     | Écran                                                                                                                                                                                                   | Rôles                            |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | `/`                                       | **EC-01 Dashboard** : KPI cards + 6 widgets sparkline + alertes panel + activité récente                                                                                                                | Tous                             |
| 2   | `/clients` (+ `[id]`, `[id]/edit`, `new`) | **EC-Clients** : 5 tabs détail (Info, Entités, Contacts, Licences, Historique). Modal import healthcheck dry-run.                                                                                       | Tous (W: ADMIN+)                 |
| 3   | `/licences`                               | **EC-02 Liste licences** : filtres recherche/statut/client/entité/produit/période + export CSV. Tri défaut `date_creation DESC`.                                                                        | Tous (W: ADMIN+)                 |
| 4   | `/licences/[id]`                          | **EC-03a Détail licence** (4 tabs) : Informations (avec section Renouvellements en bas) / Articles & volumes (groupés par produit) / Fichiers (mini + lien) / Historique                                | Tous                             |
| 5   | `/licences/[id]/edit`                     | **EC-03b Édition licence** : 3 sections empilées (Infos / Produits inclus / Articles & volumes)                                                                                                         | ADMIN+                           |
| 6   | `/licences/new`                           | **EC-03c Wizard 3 étapes** : Infos générales → Produits & articles → Récapitulatif                                                                                                                      | ADMIN+                           |
| 7   | `/volumes`                                | **EC-04 Suivi articles** : Tendance ↗↘→ + Projection (date / "Dans les temps" / "Calibrage" / "Déjà dépassé") + édition inline `vol_consomme` + `seuil_alerte_pct` + modal historique LineChart 12 mois | Tous (W seuils+consommé: ADMIN+) |
| 8   | `/history`                                | **EC-06 Journal des modifications** : filtres période/client/entité/utilisateur/type/action/mode + recherche FTS française + `<JsonDiff>` langage naturel                                               | Tous                             |
| 9   | `/alerts`                                 | **EC-07 Configuration alertes** : règles par client+produit+article, multi-destinataires (Sales + AM + email_dest), test "Envoyer avec volume sample"                                                   | ADMIN+                           |
| 10  | `/notifications` (page + drawer header)   | **EC-10 Notifications** : drawer cloche header (10 dernières) + page complète historique avec filtres                                                                                                   | Tous                             |
| 11  | `/renewals` (liste + drawer édition)      | **EC-11 Renouvellements** : 4 tabs (En cours/Validés/Créés/Annulés) + drawer "Modifier les volumes" au clic                                                                                             | ADMIN+ (V: SADMIN)               |
| 12  | `/batches`                                | **EC-12 Supervision batchs** : 5 cards jobs avec switch actif/inactif (SADMIN) + drawer logs avec contexte JSONB structuré                                                                              | ADMIN+                           |
| 13  | `/files`                                  | **EC-Files Suivi fichiers** : filtres type/statut/client/licence/dates + modal détails metadata + JSON brut                                                                                             | ADMIN+                           |
| 14  | `/reports`                                | **EC-09 Rapports** : 5 rapports (Volumétrie client PDF/Excel, Expirations, Alertes, Journal, Portefeuille global Excel 3 feuilles) avec header/footer normalisés et comportement EMPTY                  | Tous                             |
| 15  | `/settings/...`                           | **EC-13 Paramétrage** (9 onglets) : general / security / smtp / catalogues / team / **users** / sandbox / demo / info                                                                                   | SADMIN                           |
| 16  | `/profile`                                | **EC-14 Profil utilisateur** : préférence langue (FR/EN), changement mot de passe, info compte                                                                                                          | Tous                             |

**Total** : 16 routes Next.js, **14 écrans logiques**.

### 8.4 Routes techniques additionnelles

| Route                                           | Type            | Auth                                                  |
| ----------------------------------------------- | --------------- | ----------------------------------------------------- |
| `/login`, `/forgot-password`, `/reset-password` | Pages publiques | Aucune                                                |
| `/api/health`                                   | Endpoint API    | Aucune                                                |
| `/.well-known/s2m-ca.pem`                       | Endpoint API    | Aucune (toggle SADMIN) — distribution clé publique CA |
| `/admin/emergency`                              | Page            | Localhost uniquement — reset SADMIN d'urgence         |

### 8.5 Jobs planifiés (pg-boss, 5 jobs)

| Job                   | Cron          | Rôle                                                                                                                       |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `expire-licences`     | `0 2 * * *`   | Statut → `EXPIRE` quand `date_fin < NOW()`                                                                                 |
| `check-alerts`        | `0 */6 * * *` | Évalue seuils par article, crée notifs + envoie emails (Sales + AM résolus depuis `lic_team_members` + `email_dest` règle) |
| `auto-renewal`        | `0 3 * * *`   | Crée dossier renouvellement à J-60 (licence `renouvellement_auto = TRUE`)                                                  |
| `snapshot-volumes`    | `0 1 1 * *`   | Snapshot mensuel `lic_article_volume_history` (articles `a_volume = TRUE`)                                                 |
| `cleanup-old-batches` | `0 4 * * 0`   | Purge `lic_batch_logs` > 90j                                                                                               |

### 8.6 Tables BD (~26 tables)

```
Référentiels SADMIN (6) :
  lic_regions_ref, lic_pays_ref, lic_devises_ref, lic_langues_ref,
  lic_types_contact_ref, lic_team_members

Catalogue commercial (2) :
  lic_produits_ref, lic_articles_ref

Métier (11) :
  lic_clients, lic_entites, lic_contacts_clients,
  lic_licences, lic_licence_produits, lic_licence_articles, lic_article_volume_history,
  lic_renouvellement, lic_alert_config, lic_notifications, lic_audit_log

Système (4) :
  lic_users, lic_settings, lic_password_reset_tokens, lic_fichiers_log

Batchs (3) :
  lic_batch_jobs, lic_batch_executions, lic_batch_logs
```

**Améliorations BD v2 vs v1** :

- **`uuidv7` PG 18** au lieu de `serial` partout (ADR 0005)
- **VIRTUAL columns** pour statuts calculés (remplace vue `v_lic_liste`)
- **`RETURNING OLD/NEW`** PG 18 dans `auditLog.record()` (-50% des SELECT préalables)
- **DETTE-001 traitée** : `user_display` + `client_display` dénormalisés dans `lic_audit_log` + inclus dans `search_vector` FTS
- **DETTE-002 traitée** : colonne `must_change_password` dans `lic_users` + flow first-login dès phase 1
- **DETTE-003 traitée** : module email opérationnel dès phase 1 (mode simulé si `SMTP_HOST` absent)
- **PKI** : `s2m_root_private_key_pem` (chiffrée AES-GCM avec `app_master_key`) + `s2m_root_certificate_pem` dans `lic_settings` ; `client_private_key_pem` (chiffrée) + `client_certificate_pem` + `client_certificate_expires_at` sur `lic_clients`

---

## 9. Décisions structurantes (ADR)

### Format

ADR au format **Michael Nygard simplifié** dans `docs/adr/NNNN-titre-court.md` :

```markdown
# NNNN — Titre

## Status

Accepted | Superseded by NNNN | Deprecated

## Context

Pourquoi cette décision

## Decision

Ce qui est décidé

## Consequences

Bonnes / mauvaises / neutres
```

### ADR fondateurs (créés en phase 1, dans `docs/adr/`)

| #        | Titre                                                                                  | Statut   |
| -------- | -------------------------------------------------------------------------------------- | -------- |
| **0001** | Architecture single-app Next.js full-stack                                             | Accepted |
| **0002** | PKI S2M : CA auto-signée + certificats clients                                         | Accepted |
| **0003** | Hiérarchie Client → Entité → Licence                                                   | Accepted |
| **0004** | Recherche audit via Postgres FTS français                                              | Accepted |
| **0005** | Identifiants `uuidv7` PG 18                                                            | Accepted |
| **0006** | Catalogue commercial Produits → Articles                                               | Accepted |
| **0007** | Seed démo : réutilisation v1                                                           | Accepted |
| **0008** | Convention nommage fichiers composants React                                           | Accepted |
| **0009** | Variante B Next.js full-stack (alignement §4.12)                                       | Accepted |
| **0017** | PK `serial` pour les 6 tables référentiels paramétrables (exception bornée à ADR 0005) | Accepted |
| **0018** | CSP nonces production-only (Variante A+nonces) — résolution DETTE-LIC-004              | Accepted |
| **0019** | Implémentation PKI Phase 3 — précisions et dérogations vs ADR 0002                     | Accepted |

### ADR anticipés (non créés — décisions absorbées dans le code)

Les ADR 0010 à 0016 listés au bootstrap (Suivi fichiers, Détail licence 4 tabs, Wizard 3 étapes, Dashboard sparkline, Notifications drawer, Renouvellements drawer, Users in Settings) **n'ont pas été matérialisés en fichiers ADR** — les décisions sont visibles dans le code et les commits de Phase 4-12 (référence : §2 historique commits par phase). Seuls les choix structuraux durables ou à dérogation Référentiel ont reçu un ADR (0017 PK serial, 0018 CSP nonces). Les autres anticipations relèvent de choix d'implémentation routiniers documentés en commit message + commentaire de code.

### Dette technique reportée

| #                                        | Dette                                                                         | Statut v2 |
| ---------------------------------------- | ----------------------------------------------------------------------------- | --------- |
| **DETTE-001** v1 (FTS audit limité)      | **Traitée d'entrée** : `user_display` + `client_display` dans `search_vector` |
| **DETTE-002** v1 (force-change-password) | **Traitée d'entrée** : `must_change_password` + flow Auth.js v5               |
| **DETTE-003** v1 (SMTP non opérationnel) | **Traitée d'entrée** : module email opérationnel + mode simulé                |

---

## 10. Dette technique LIC v2 (en cours)

Format : `DETTE-LIC-NNN — Titre court`. Une dette = limitation acceptée à corriger ultérieurement (à ne pas confondre avec un ADR qui acte une décision permanente).

À distinguer de la sous-section 9 "Dette technique reportée" qui répertorie les dettes héritées de v1 (toutes traitées d'entrée).

### Dettes ouvertes

- **DETTE-LIC-003 — `app/scripts/load-env.ts` throw `ENOENT` si `app/.env` absent** : `process.loadEnvFile(".env")` (Node 21.7+) crashe quand le fichier est absent, alors que les variables peuvent déjà être présentes dans `process.env`. Le loader devrait être permissif dans ce cas. **Priorité** : moyenne. **Workaround actuel** : générer un `app/.env` (peuplé depuis le job `env:` block) en step CI avant `pnpm db:migrate` (cf. `.github/workflows/ci.yml`). À traiter Phase 13.x+.
- **DETTE-LIC-005 — i18n namespace `files.*` manquant** : `AppSidebar` rend déjà l'item `nav.items.files` (clé existante) mais aucune clé `files.*` n'est définie pour le futur écran EC-Files. À ajouter quand la Phase 10 introduira la page `/files`. **Priorité** : basse. **Phase** : 10 (fichiers + génération `.lic`).
- ~~**DETTE-LIC-006 — UI Edit absente sur les 6 référentiels SADMIN**~~ — **résolue Phase 14 (Chantier C)** : 6 Server Actions `update*Action` + composant `RefEditDialog` factorisé câblé dans les 6 sous-onglets `/settings/team`. Bouton "Modifier" par row → dialog pré-rempli (sélecteurs immuables désactivés) → submit → revalidatePath.

### ~~DETTE-LIC-008 — PKI absente à la création client (Phase 4 avant Phase 3)~~ — **résolue Phase 3.D + 3.E**

Phase 3 (Mai 2026) résout cette dette en deux temps :

- **3.D** : `createClientUseCase` refactoré — pré-check CA présente (throw SPX-LIC-411 si absente), génération paire RSA-4096 client + cert X.509 signé par CA + persistance des 3 colonnes PKI (`client_private_key_enc`, `client_certificate_pem`, `client_certificate_expires_at`) dans la même tx que l'INSERT client + audit `CERTIFICATE_ISSUED`.
- **3.E** : `backfillClientCertificatesUseCase` (use-case + script `pnpm script:backfill-client-certs` + UI section dans `/settings/security`) génère rétroactivement les certs pour les clients pré-Phase-3 (audit mode `SCRIPT`).

Cf. ADR-0019 pour les choix d'implémentation (RSA-4096, RSASSA-PKCS1-v1_5, AES-GCM, @peculiar/x509 exception bornée).

### ~~DETTE-LIC-009 — Breadcrumb header dynamique nom d'entité~~ — **résolue Phase 16**

- **Solution Phase 16** : `EntityNameContext` (React Context Provider à la racine du dashboard layout) + `EntityNameSetter` (Client Component rendu par `clients/[id]/layout.tsx` et `licences/[id]/layout.tsx`). Le Setter pose la valeur via `useEffect` au mount → le Breadcrumb la consomme via `useEntityName()`.
- **Affichage final** : "Clients › Bank Al-Maghrib › Info" (au lieu de "Clients › Détail › Info"), même pattern pour `/licences/[id]/*` (référence licence).
- **Fallback** : si aucun setter actif (cas hors `/clients/[id]/*` et `/licences/[id]/*`), retombe sur `tBc("detail")` (préserve le rendu Phase 11.C).
- **Trade-off accepté** : bref flash "Détail" entre le mount du layout et le useEffect du Setter. Imperceptible en pratique sur des fetches < 100 ms côté Server Component.
- **Fichiers** : `app/src/components/layout/EntityNameContext.tsx` (NEW), `Breadcrumb.tsx` (consume), `(dashboard)/layout.tsx` (provider), `clients/[id]/layout.tsx` + `licences/[id]/layout.tsx` (setter).

### ~~DETTE-LIC-011 — `allocateNextReference` race possible~~ — **résolue Phase 16**

- **Solution Phase 16** : migration **0013** — `CREATE SEQUENCE lic_licence_reference_seq START 1` + bootstrap `setval()` aligné sur `MAX(NNN)` des licences existantes. `allocateNextReference()` utilise `nextval()` atomique côté PG, élimine la race condition.
- **Trade-off accepté** : la séquence est **globale** (non resetée par année). Numérotation continue cross-années (ex: LIC-2027-123 si la dernière de 2026 était LIC-2026-122). Acceptable pour le cas d'usage S2M (les banques ne se basent pas sur la numérotation pour leur audit interne).
- **Tests** : `allocate-next-reference.spec.ts` — 3 cas (format, monotonie séquentielle 10 appels, concurrence Promise.all 10 → unicité).
- **R-41** capitalisée dans `docs/referentiel-feedback.md` : « Séquences PG pour références métier monotones — évite races sans lock applicatif ».

### ~~DETTE-LIC-012 — Tab Articles licence reste un PhaseStub Phase 6~~ — **résolue Phase 6.F (commit `c5466a3`)**

Tab `/licences/[id]/articles` débloquée : sections produits + sous-tables articles avec volumes (consommé/autorisé/taux), Dialogs Add Produit / Add Article / Edit Volume / Remove. L'onglet `/settings/catalogues` (DETTE résiduelle des stubs Phase 2.B) est également opérationnel (CRUD SADMIN produits + articles). 11 Server Actions, schémas Zod cf. `shared/src/schemas/produit.schema.ts`, codes SPX-LIC-743..754.

### ~~DETTE-LIC-013 + DETTE-LIC-014 — Dropdowns 200 items non-paginés~~ — **résolues Phase 16**

- **Solution Phase 16** : composant `SearchableSelect` (`app/src/components/ui/searchable-select.tsx`) — combobox léger avec recherche textuelle client-side, navigation clavier ↑↓ Enter, accessibilité ARIA, hidden form input pour soumission HTML standard. Pas de dépendance shadcn Command/Popover (primitives natives Input + ul/li).
- **Câblage** :
  - **DETTE-LIC-013** : `ImportHealthcheckClientButton.tsx` (`<select>` licences ACTIVE → `<SearchableSelect>` filtre par référence).
  - **DETTE-LIC-014** : `RenewalsList.tsx` (`<select>` clients filtre → `<SearchableSelect>` filtre par label).
- **Pas de pagination cursor** : les 200 items pré-chargés sont filtrés en temps réel côté client (suffisant pour le volume cible mono-tenant 100-200 clients / licences-par-client). Si volume réel >200 dans le futur, l'extension serveur via `q` paramètre est triviale (déjà supporté côté repos via `ilike`).

### ~~DETTE-LIC-015 — i18n FR/EN absent sur `/settings/security` et `/settings/sandbox`~~ — **résolue Phase 16**

- **Solution Phase 16** : extraction complète des chaînes UI vers les namespaces `settings.security.*` (titre, sous-titre, section CA — 11 clés, section Expose — 4 clés, section Backfill — 6 clés) et `settings.sandbox.*` (titre, sous-titre, 5 sections × ~7 clés chacune = ~35 clés). Composants convertis avec `useTranslations` / `getTranslations` pattern.
- **Fichiers** : `messages/fr.json` + `messages/en.json` enrichis (~50 clés ajoutées), `security/page.tsx` + `_components/CASection.tsx` + `sandbox/page.tsx` + `_components/SandboxPanel.tsx` convertis.

### ~~DETTE-LIC-016 — Tests d'intégration `createClientUseCase` mode PKI~~ — **résolue Phase 16**

- **Solution Phase 16** : 3 tests PKI dual-mode ajoutés à `create-client.usecase.spec.ts` :
  1. **CA présente** : cert client généré + `client_private_key_enc` + `client_certificate_pem` + `client_certificate_expires_at` persistés + audit `CLIENT_CREATED` + `CERTIFICATE_ISSUED` dans la même tx.
  2. **CA absente** : throw SPX-LIC-411 + aucun client persisté (pré-check hors tx).
  3. **PKI + contacts** : atomicité préservée (cert + Siège + 2 contacts dans la même tx — 4 audits posés).
- **Fixtures réelles** : `generateRsaKeyPair()` + `generateCACert()` + `packCARecord()` insérés dans `lic_settings` (clé `s2m_root_ca`) avant chaque test PKI. `appMasterKey` aléatoire généré par test. Variante `useCasePki` du use-case avec `settingRepository` + `contactRepository` câblés.
- **Architecture dual-mode conservée** : la solution future "port `ClientCertIssuer` obligatoire" reste pertinente pour un cleanup architectural plus tard, mais la couverture est maintenant complète.

### ~~DETTE-LIC-017 — Section contacts par type embarquée dans `ClientDialog`~~ — **résolue Phase 14 (Chantier D)**

Phase 14 livre les contacts à la **création** client (cross-aggregate atomique) :

- `createClientUseCase` accepte `input.contacts?: ReadonlyArray<{typeContactCode, nom, prenom?, email?, telephone?}>` (max 5) + nouvelle dépendance `contactRepository?` injectée. Persistance dans la **même `db.transaction`** que client + Siège + 1 audit `CONTACT_CREATED` par contact (règle L3 préservée).
- Schéma Zod `CreateClientSchema.contacts` ajouté à `shared/src/schemas/client.schema.ts` (+ `ContactInputSchema` ré-exporté).
- UI `ClientDialog` mode create : section dynamique "Contacts (Siège)" avec ajout/retrait jusqu'à 5 (typeContact, nom, prénom, email, téléphone). Liste types_contact propagée depuis `clients/page.tsx`.
- Tests : 3 nouveaux dans `create-client.usecase.spec.ts` (contacts OK, rollback FK invalide, sans contacts inchangé).

L'édition embarquée des contacts existants en mode edit (ajout/edit/delete inline dans `ClientDialog` mode edit) reste différée — la page dédiée `/clients/[id]/contacts` (lien depuis le Dialog) reste le chemin pour les opérations post-création.

### DETTE-LIC-020 — PDF Référentiel S2M v2.1 non encore intégré

- **Cause** : Audit Master Mai 2026 cible v2.1 (alignement Phase 15 livré) mais le PDF v2.1 du Référentiel S2M n'est pas encore poussé dans le repo. `docs/REFERENTIEL_S2M.pdf` reste v2.0 jusqu'à publication officielle (T+2 semaines selon note S2M direction technique).
- **Impact** : la doc projet (CLAUDE.md, PROJECT_CONTEXT_LIC.md, README.md) référence v2.1 alors que le PDF dans le repo est encore v2.0. Cohérence visuelle à compléter quand le PDF arrive.
- **Workaround** : `docs/REFERENTIEL_S2M_v2_1_PENDING.md` documente la situation + table des différences v2.0 → v2.1 recensées via l'audit Master.
- **Solution future** :
  1. Remplacer `docs/REFERENTIEL_S2M.pdf` par la version v2.1 quand publiée.
  2. Supprimer `docs/REFERENTIEL_S2M_v2_1_PENDING.md`.
  3. Vérifier qu'aucune règle Phase 15 ne diverge des nouvelles sections du PDF v2.1.
- **Priorité** : basse (cohérence documentaire, pas de blocage technique).
- **Phase cible** : Phase 16+ ou réception PDF v2.1.

### DETTE-LIC-021 — MFA TOTP différé (audit Master C2) — **plan définitif Phase 16**

- **Statut Phase 16** : volontairement différé post-déploiement client v1. Le plan ci-dessous est figé pour l'implémentation future (Phase 17+ ou demande client).
- **Cause** : Audit Master Mai 2026 a identifié l'absence de MFA (TOTP / Authenticator App) sur le login back-office. Acceptable mono-tenant interne avec audience SADMIN/ADMIN restreinte (≤20 comptes BO S2M, accès depuis réseau corporate).
- **Impact** : un attaquant qui obtient un mot de passe SADMIN par phishing/leak n'est pas bloqué par un facteur supplémentaire. Risque atténué Phases 15-16 par :
  - **(a) Brute-force lockout** (Phase 15 C1) : 5 échecs consécutifs → 60 min lockout + audit `LOGIN_FAILED_LOCKOUT`.
  - **(b) Cookies session** : `SameSite=strict` + `httpOnly` + `secure` en prod.
  - **(c) bcrypt cost 10** : ~100 ms/hash, ralentit les attaques offline si dump BD.
  - **(d) Audit lectures sensibles** (Phase 16 C3) : `CLIENT_READ` + `EXPORT_CSV_*` tracés → forensics post-incident.
- **Plan définitif** (à exécuter Phase 17+ si déclenchement) :
  1. **Module hexagonal `mfa/`** :
     - `domain/mfa-secret.entity.ts` : entité MfaSecret (encryptedSecret, recoveryCodesHashes[]).
     - `ports/totp-provider.ts` : abstract class avec `generateSecret()`, `verifyCode(secret, code, window=1)`, `generateProvisioningUri(account, secret)`.
     - `adapters/otpauth/totp-provider.otpauth.ts` : impl via lib `otpauth` (RFC 6238 standard).
     - `application/enroll-mfa.usecase.ts`, `verify-mfa.usecase.ts`, `disable-mfa.usecase.ts`, `regenerate-recovery-codes.usecase.ts`.
  2. **Migration 0014 — schéma users** :
     - `mfa_secret_enc text NULL` (chiffré AES-256-GCM avec `APP_MASTER_KEY`, format `iv:tag:ct`).
     - `mfa_enabled boolean NOT NULL DEFAULT false`.
     - `mfa_recovery_codes jsonb NULL` (array de hashes bcrypt — 10 codes one-shot).
     - `mfa_enrolled_at timestamptz NULL`.
  3. **Flow d'enrôlement (UI `/profile/mfa/enroll`)** :
     - Génère secret aléatoire (32 octets base32) + chiffre AES-GCM avant persistance.
     - Affiche QR code provisioning (otpauth://totp/...).
     - User scanne avec Google Authenticator / Authy / 1Password.
     - User saisit code 6 chiffres pour activation → `verifyCode()` → `mfa_enabled=true`.
     - Affiche 10 codes de récupération one-shot (hashs persistés en BD).
  4. **Step login (`auth/config.ts`)** :
     - Si `mfa_enabled=true` après vérif password → ne PAS encore émettre JWT complet.
     - Émettre JWT court-durée (5 min, `mfa_pending: true`) → redirige `/login/mfa-challenge`.
     - Page `/login/mfa-challenge` : input 6 chiffres → vérif TOTP → JWT complet.
     - Bypass via code de récupération : if input matches one of the bcrypt hashes → consume + JWT complet.
  5. **Audit** : `MFA_ENROLLED`, `MFA_DISABLED`, `MFA_VERIFIED`, `MFA_RECOVERY_USED`, `MFA_FAILED_LOCKOUT` (réutilise C1 lockout sur les codes TOTP).
  6. **Tests** : enroll + verify happy path, mauvais code, recovery code, lockout après 5 échecs TOTP, disable.
- **Priorité** : moyenne (sécurité défense en profondeur). Devient **haute** si :
  - Déploiement client multi-banques avec accès distant SADMIN.
  - Audit régulateur (Bank Al-Maghrib, BCEAO) demande facteur multiple.
  - Incident sécurité (phishing réussi sur un BO S2M).
- **Phase cible** : Phase 17+ (jalon dédié sécurité auth post-déploiement client v1).

### ~~DETTE-LIC-022 — Audit des lectures sensibles~~ — **résolue Phase 16 (périmètre MVP minimal)**

- **Solution Phase 16** : 4 actions audit ajoutées + use-cases instrumentés best-effort :
  - **`CLIENT_READ`** : `getClientUseCase` accepte `actorId?` + ports audit/user optionnels. Câblé cross-module dans composition-root. Émis quand l'utilisateur consulte le détail d'un client (page `/clients/[id]/info`).
  - **`FICHIER_LOG_READ`** : `listFichiersByLicenceUseCase` même pattern — câblé cross-module, prêt à recevoir actorId quand un consommateur UI direct sera ajouté.
  - **`EXPORT_CSV_LICENCES`** + **`EXPORT_CSV_RENOUVELLEMENTS`** : audit dans `reports/_actions.ts` après chaque export réussi (pattern Server Action via `recordAuditEntryUseCase`).
- **Pattern best-effort** : try/catch + log Pino warn sur échec audit (l'erreur d'audit ne propage pas — la lecture/export reste OK pour l'utilisateur).
- **Limitation acceptée** : seul `clients/[id]/info` propage `actorId` côté Server Component (les layouts + listings restent sans audit pour ne pas spammer l'audit log avec des entrées par chaque navigation).
- **Politique de rétention** différée : la séparation audits "mutations 5 ans" vs "lectures 90 jours" reste à définir si volume devient un souci (volume actuel : ~100-500 lectures/jour estimé sur back-office S2M ≤20 BO, négligeable face aux mutations).
- **Phase cible "extension complète"** : si compliance régulateur (Bank Al-Maghrib, BCEAO) demande audit exhaustif des consultations PII, étendre le pattern aux autres use-cases lecture (`listClientsUseCase`, `getLicenceUseCase`, etc.) et ajouter UI audit-query filtrée par "kind" (mutation vs lecture).

### DETTE-LIC-010 — Liste `typeContactCode` statique dans `ContactDialog`

- **Cause** : Phase 4.F livre `ContactDialog` avec un `<select>` peuplé d'une liste statique `TYPES_CONTACT_OPTIONS` (6 valeurs : ACHAT/FACTURATION/TECHNIQUE/JURIDIQUE/TECHNIQUE_F2/DIRECTION). Le SADMIN administre la vraie liste depuis `/settings/team` (Phase 2.B) via `lic_types_contact_ref`, mais le Dialog ne fetch pas cette liste dynamiquement.
- **Impact** : si le SADMIN ajoute un type (ex: `RGPD`), il ne sera pas visible dans le sélecteur Phase 4.F. La validation FK côté serveur attrape les codes inconnus, mais l'UX ne reflète pas la liste autoritative.
- **Solution future** : fetcher `listTypesContactUseCase` côté Server Component `contacts/page.tsx`, passer la liste en prop à `ContactsTab` → `ContactDialog`.
- **Priorité** : basse.
- **Phase cible** : 4.G ou plus tôt si demande métier.

### Dettes résolues

- **DETTE-LIC-001 — OpenTelemetry Web non installé en Phase 1** → **Résolue F-10** (`@opentelemetry/api` + `sdk-trace-web` installés, `OtelProvider` actif côté client, propagation `traceparent` opérationnelle).
- **DETTE-LIC-002 — `middleware.ts` deprecated Next.js 16** → **Sans objet (F-12)** puis **réintroduit Phase 13.A sous le nom canonique `proxy.ts`** (cf. ADR 0018) — le proxy n'a aucune logique d'auth (le check auth reste dans `(dashboard)/layout.tsx`), il porte uniquement la CSP nonce-based en prod.
- **DETTE-LIC-003 — `app/scripts/load-env.ts` throw `ENOENT` si `app/.env` absent** → **Workaround acceptable**, marquée résolue Phase 13.E : `Dockerfile` runner-app monte un `.env` vide via la step compose (option simple), et le script CI continue de générer un `.env` pré-populé. Le refactor permissif du loader Node 21.7+ est conservé en backlog optionnel mais non bloquant. **Statut** : workaround pérenne accepté.
- **DETTE-LIC-004 — CSP avec `'unsafe-inline'` + `'unsafe-eval'`** → **Résolue Phase 13.A** (commit `2b8fc3c`, ADR 0018). `app/src/proxy.ts` (Next.js 16, NODE_ENV !== 'production' guard) génère un nonce par requête et applique `script-src 'self' 'nonce-XXX' 'strict-dynamic'` en prod. `'unsafe-inline'` script + `'unsafe-eval'` éliminés en prod ; `'unsafe-inline'` style conservé en prod (compromis assumé Tailwind/Radix). DEV inchangé pour DX Turbopack/HMR.
- **DETTE-LIC-007 — `BUILD_SHA` non injecté en CI** → **Résolue Phase 13.C** (commit `7f4d27c`). `.github/workflows/ci.yml` exporte `BUILD_SHA: ${{ github.sha }}` à la step build → `/settings/info` affiche le SHA réel en prod, fallback `"dev"` en local. Aussi propagé via `Dockerfile` ARG BUILD_SHA pour le build container.
- **DETTE-LIC-012 — Tab Articles licence reste un PhaseStub Phase 6** → **Résolue Phase 6.F** (commit `c5466a3`, cf. plus haut).

---

## 11. Design system SELECT-PX (alignement Référentiel §4.4)

### Source locale

- **`docs/design/index.html`** : tokens, brand, install, references
- **`docs/design/gallery.html`** : 8 templates de référence (dashboard, liste, détail, etc.)

> **Règle Référentiel §4.4** : pas d'invention visuelle. Toute couleur/taille/radius/ombre/composant vient du DS. En cas de doute : lire `docs/design/index.html` sections 03 (tokens), 14 (stack), 15 (install).

### Tokens à intégrer en `@theme` Tailwind 4 (`globals.css`)

```css
@theme {
  /* Marque SELECT-PX */
  --color-spx-cyan-100: #74ecff;
  --color-spx-cyan-500: #00caff;
  --color-spx-blue-600: #0066d6;
  --color-spx-blue-900: #0006a5;
  --color-spx-ink: #3f3f3e;

  /* Surfaces sombres (sidebar, header) */
  --color-surface-0: #0b0d12;
  --color-surface-1: #11141b;
  --color-surface-2: #1a1f2b;
  --color-border-subtle: #242a38;

  /* Sémantique */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;

  /* Typo */
  --font-display: "Montserrat", "Helvetica Neue", sans-serif; /* 800 */
  --font-sans: "Poppins", system-ui, sans-serif; /* 300/500 */
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Gradient signature */
  --gradient-spx: linear-gradient(90deg, #74ecff 0%, #00caff 55%, #0006a5 100%);
}
```

### Composants Brand (à dériver dans `app/src/components/brand/`)

- **`<BrandLockup />`** : tile sombre + chevron X + wordmark `SELECT-PX | LIC_PORTAL`
- **`<SpxTile />`** : tile sombre seule (pour favicon, splash)

### Polices via `next/font/google` (Référentiel §4.4)

```ts
import { Montserrat, Poppins, JetBrains_Mono } from "next/font/google";
const display = Montserrat({ weight: "800", subsets: ["latin"] });
const sans = Poppins({ weight: ["300", "500"], subsets: ["latin"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });
```

### Layout sidebar sombre (acquis sprint 10)

- Sidebar `surface-0` avec logo `/logos/logo-white.svg`
- Items filtrés par rôle au rendu
- 4 groupes : **Gestion** (Tableau de bord, Clients, Licences, Articles, Renouvellements) / **Surveillance** (Alertes ADMIN+, Notifications) / **Rapports** (Rapports, Fichiers ADMIN+) / **Système** (Journal, Batchs ADMIN+)
- **Paramétrage** isolé en bas (SADMIN) — incluant Utilisateurs comme onglet (amélioration A1)

### shadcn/ui customisé

Installation : `pnpm dlx shadcn@latest add button input badge table card dialog tabs sheet drawer`. Customisation via overrides locaux qui appliquent les tokens du DS.

---

## 12. Workflow Claude Code

### En début de session

Conformément Référentiel §4.1 :

1. Lire `CLAUDE.md` racine
2. Lire `app/CLAUDE.md` (workspace concerné)
3. Lire `PROJECT_CONTEXT_LIC.md` (ce document)
4. Lire le ou les `CLAUDE.md` du module concerné si présent
5. Scanner module voisin pour patterns en place
6. **N/A pour LIC v2 phase 1** : chercher dans `@s2m/core-*` et `@s2m/monetique-*` (Annexe A Référentiel) — les packages n'existent pas encore, donc voir section 7 ci-dessus.

### Workflow d'une tâche

Adapté du Référentiel §4.9 :

1. Identifier le module concerné (`app/src/server/modules/<X>/`)
2. Scanner code voisin pour patterns
3. **Étendre `shared/src/schemas/`** si contrat API impacté
4. Implémenter en respectant l'hexagonal (templates §4.12 du Référentiel)
5. Écrire tests Vitest (`domain/__tests__/`, `application/__tests__/`) — couverture ≥80%
6. Ajouter Server Action dans `app/src/app/(dashboard)/<X>/_actions.ts` si UI impactée
7. Si schéma BD : créer migration via `pnpm db:generate`
8. `make lint` (typecheck + boundaries + gitleaks) doit passer
9. Mettre à jour `PROJECT_CONTEXT_LIC.md` si décision structurelle ou changement de phase
10. Si nouvelle décision structurante : ajouter ADR

### Commandes unifiées (Référentiel §4.10)

| Commande       | Effet                                    |
| -------------- | ---------------------------------------- |
| `make dev`     | Démarre app + worker + datastores Docker |
| `make test`    | Tests unitaires + intégration + E2E      |
| `make build`   | Build production tous workspaces         |
| `make lint`    | Lint + typecheck + boundaries + gitleaks |
| `make migrate` | Applique migrations Drizzle Kit          |
| `make clean`   | Nettoie builds + arrête conteneurs       |

### Ce qu'il NE FAUT PAS faire (rappel)

- Pas de procédures stockées Postgres (logique en TypeScript)
- Pas de `useEffect` pour fetch (Server Components ou TanStack Query)
- Pas de mutations directes en composant client (Server Actions)
- Pas de CSS inline ni CSS modules (Tailwind only)
- Pas de bibliothèque UI lourde (shadcn/ui only)
- Pas de gestion d'état globale sans justification
- Pas de secret en dur (`process.env.X` validé via `infrastructure/env/`)

---

## 13. Glossaire métier

| Terme                           | Définition                                                                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SELECT-PX** (SPX)             | Marque parente S2M des produits monétiques. Vendu sous forme de suites commerciales.                                                                                                                |
| **F2**                          | Supervisor logiciel S2M déployé chez chaque client (banque). Lit le fichier `.lic`, applique les volumes contractuels, génère les healthchecks de remontée.                                         |
| **Fichier de licence (`.lic`)** | Fichier généré par LIC, signé RSA-SHA256 avec la clé privée du client (signée elle-même par CA S2M). Contient le payload contractuel JSON v2. F2 le vérifie avec la clé publique CA (cf. ADR 0002). |
| **Healthcheck (`.hc`)**         | Fichier généré par F2 chiffré AES-256-GCM avec clé partagée. Contient les volumes consommés actuels. Importé par LIC en mode dry-run obligatoire (cf. règle L15).                                   |
| **CA S2M**                      | Autorité de certification interne S2M, auto-signée. Signe les certificats clients. Sa clé publique est distribuée à tous les F2.                                                                    |
| **Article `a_volume = true`**   | Article facturable avec quota contractuel (ex: nb GAB, nb porteurs). Suivi en consommation.                                                                                                         |
| **Article `a_volume = false`**  | Article de simple présence/activation (ex: module activé ou pas). Pas de suivi numérique.                                                                                                           |
| **Tendance**                    | Indicateur ↗↘→ d'évolution de consommation sur 3 derniers mois (DEC-004 v1, calcul `computeArticleTrend`).                                                                                          |
| **Projection**                  | Date estimée de dépassement contractuel projetée à partir de la tendance. Affiche aussi "Dans les temps" / "Calibrage" / "Déjà dépassé".                                                            |
| **Dossier de renouvellement**   | Workflow 5 étapes vers une nouvelle licence : Création → Modification volumes → Validation SADMIN → Création licence cible → Génération fichier.                                                    |
| **DEC-NNN**                     | Décisions historiques v1 (LIC_PORTAL ancien). Remplacées en v2 par des **ADR** (cf. section 9).                                                                                                     |
| **ADR**                         | Architecture Decision Record. Format Michael Nygard. Une décision = un fichier markdown autonome dans `docs/adr/`.                                                                                  |
| **ECxx**                        | Identifiant historique d'écran v1 (EC-01 = Dashboard, etc.). Conservé en v2 pour cohérence avec la base de connaissances.                                                                           |
| **SSV6**                        | Ancienne version SELECT-PX. Articles dupliqués `_SPX` / `_V6` quand les volumes diffèrent entre versions chez un même client.                                                                       |
| **Sandbox SADMIN**              | Page `/settings/sandbox` permettant de tester les fonctions crypto end-to-end sans aucune écriture en BD (cf. règle L16).                                                                           |

---

## 14. Sources de vérité et références

| Source                             | Emplacement                                             | Rôle                                                                        |
| ---------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Référentiel Technique S2M v2.1** | `docs/REFERENTIEL_S2M.pdf` (à copier dans le repo)      | Règles transverses universelles, 25 pages                                   |
| **CLAUDE.md** racine               | `/CLAUDE.md`                                            | ≤300 lignes, lu en début de session par Claude Code                         |
| **Ce document**                    | `/PROJECT_CONTEXT_LIC.md`                               | État spécifique LIC v2 (cadrage + périmètre)                                |
| **ADR fondateurs**                 | `docs/adr/0001-*.md` à `0006-*.md`                      | Décisions structurantes                                                     |
| **Design system**                  | `docs/design/index.html` + `gallery.html`               | Tokens + 8 templates (DS local)                                             |
| **Spec format F2**                 | `docs/integration/F2_FORMATS.md`                        | Spec binaire `.lic` + `.hc` + snippets Node.js / Web Crypto                 |
| **Architecture**                   | `docs/architecture.md`                                  | Vue d'ensemble (renvoi vers ADR)                                            |
| **CLAUDE.md** workspace            | `app/CLAUDE.md`, `app/src/server/modules/<X>/CLAUDE.md` | Règles locales par workspace/module                                         |
| **Référence v1**                   | Repo Git interne S2M (lecture seule)                    | Référence fonctionnelle (besoins, écrans, workflows). Pas de copie de code. |
