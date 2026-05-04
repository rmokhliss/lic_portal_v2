# Feedback Référentiel S2M — Archive de remontées (capitalisation close)

> **Statut** : Capitalisation close (Mai 2026).
> 15 des 23 remontées ont été intégrées dans le Référentiel S2M v2.0 (livraison Mai 2026).
> 8 sont hors scope du Référentiel ; certaines ont fait l'objet de capitalisations locales dans LIC v2 (voir tableau ci-dessous).
> Conserver ce fichier en archive pour traçabilité.

---

## Statuts (Mai 2026 — retour Master Référentiel)

### Intégrées dans Référentiel v2.0 (15)

| ID   | Sort       | Localisation Référentiel v2.0                 |
| ---- | ---------- | --------------------------------------------- |
| R-01 | Integrated | §3.2 + §4.18 (`.nvmrc` version exacte)        |
| R-02 | Integrated | §1.1 + §4.18 (`packageManager` + Corepack)    |
| R-04 | Integrated | §1.3 (pas de `tailwind.config.ts`)            |
| R-05 | Integrated | §4.4 (casse `NEXT_PUBLIC_PRODUCT_*`)          |
| R-06 | Integrated | §4.7 (Stop & Validate)                        |
| R-07 | Integrated | §4.5 (PascalCase composants React)            |
| R-08 | Integrated | §4.18 (gitignore exception `.pem`)            |
| R-09 | Integrated | §3.3 (template ADR)                           |
| R-10 | Integrated | §4.21 (PROJECT_CONTEXT.md formalisé)          |
| R-11 | Integrated | §4.13.2 (justification `abstract class`)      |
| R-13 | Integrated | §4.12 (variantes architecturales A/B)         |
| R-14 | Integrated | §4.2 (tags Critique / Universel / Contextuel) |
| R-19 | Integrated | §4.18 (config-type `no-restricted-imports`)   |
| R-22 | Integrated | §4.13.6 (template Server Action Next.js)      |
| R-23 | Integrated | §4.17 (architecture next-intl)                |

### Hors scope du Référentiel (8)

Ces remarques sont valides mais ne relèvent pas d'un référentiel technique pur (gouvernance, portfolio, processus opérationnel). Certaines ont été capitalisées localement dans LIC v2 (voir colonne "Traitement").

| ID   | Sort         | Traitement                                                                      |
| ---- | ------------ | ------------------------------------------------------------------------------- |
| R-03 | Out of scope | À recapitaliser dans `docs/setup-windows.md` LIC (optionnel)                    |
| R-12 | Out of scope | Affaire S2M-direction-technique (futur `S2M_GOVERNANCE.md`)                     |
| R-15 | Out of scope | Repo `s2m-portfolio` (futur, hors LIC)                                          |
| R-16 | Out of scope | À traiter dans `PROJECT_CONTEXT_LIC.md` projet par projet                       |
| R-17 | Out of scope | **Capitalisé** : section "Dette technique LIC v2" dans `PROJECT_CONTEXT_LIC.md` |
| R-18 | Out of scope | **Capitalisé** : `docs/audit/` LIC pour archiver les rapports                   |
| R-20 | Out of scope | **Capitalisé** : `docs/peer-deps-tracker.md` LIC                                |
| R-21 | Out of scope | À traiter ad-hoc dans `PROJECT_CONTEXT_LIC.md` (note convention)                |

---

## Remarques en cours

### R-01 — Figer la version Node **exacte** dans `.nvmrc`

**Statut** : Open
**Référentiel concerné** : §1.1 (Stack), §3.2 (standards racine), §4.17 (outillage repo)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel §1.1 indique `Node.js 24 LTS "Krypton" (24.15.0)` mais §3.2 mentionne juste `.nvmrc` dans l'arborescence sans préciser le contenu. Le bootstrap initial LIC v2 a livré un `.nvmrc` contenant `24` (version flottante), ce qui peut entraîner une divergence entre développeurs si une 24.16.x sort plus tard.

**Proposition** :
Préciser dans le Référentiel que `.nvmrc` contient la **version exacte alignée Référentiel** (ex: `24.15.0`), pas la version mineure (`24`). Ajouter un exemple en §3.2 :

```
.nvmrc          contenu obligatoire : version EXACTE figée Référentiel (ex: 24.15.0)
                pas de "24" ou "lts/krypton" — précision figée pour reproductibilité
```

---

### R-02 — Documenter `packageManager` + Corepack dans la stack standard

**Statut** : Open
**Référentiel concerné** : §1.1 (Stack), §3.2 (standards racine)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel mentionne "Workspaces pnpm" sans détailler comment garantir que tous les développeurs et la CI utilisent la **même version exacte** de pnpm. Sans `packageManager` + Corepack, un dev qui a `pnpm@10.x` global se retrouve à utiliser une version différente du projet, ce qui peut causer des `pnpm-lock.yaml` divergents.

**Proposition** :
Ajouter en §3.2 (ou nouveau §1.1.1 "Verrouillage des versions") :

```
package.json (racine) :
  - Champ "packageManager": "pnpm@<version>" obligatoire
  - Aligné sur la version Référentiel (ex: "pnpm@9.15.0")
  - Permet à Corepack de forcer la bonne version automatiquement

Bootstrap équipe :
  - corepack enable (à exécuter une fois sur chaque poste de dev et en CI)
  - Garantit que `pnpm` lu depuis le repo utilise toujours la version définie
```

Cas pratique vécu : sur LIC v2, un dev avec `pnpm 9.15.9` global a tenté de figer le projet à `9.15.9`. Corepack a permis de **conserver** la version Référentiel `9.15.0` sans toucher au global du dev. **C'est exactement le pattern à standardiser.**

---

### R-03 — Annexe pratique "Setup environnement Windows"

**Statut** : Open
**Référentiel concerné** : nouvelle annexe à créer
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Sur Windows, deux pièges récurrents bloquent les développeurs au premier démarrage :

1. **PowerShell ExecutionPolicy** : `npm.ps1` bloqué par défaut, `npm --version` plante avec `UnauthorizedAccess`
2. **BOM dans les fichiers JSON édités via `Set-Content -Encoding UTF8`** : ajoute un BOM UTF-8 qui invalide le JSON pour les parseurs (Node, Git, etc.)

**Proposition** :
Ajouter une annexe **pratique** (pas dans les règles, dans une annexe d'aide au démarrage) :

```
Annexe X — Setup environnement développeur

X.1 Windows
  - PowerShell ExecutionPolicy :
      Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  - Édition fichiers JSON/YAML : utiliser VS Code ou éditeur sans BOM
    NE PAS utiliser PowerShell `Set-Content -Encoding UTF8` (ajoute BOM)
  - Préférer nvm-windows + Corepack pour gestion versions

X.2 macOS / Linux
  - Préférer fnm ou nvm + Corepack
  - ...
```

---

### R-04 — Tailwind 4 idiomatique : pas de `tailwind.config.ts`

**Statut** : Open
**Référentiel concerné** : §1.3 (Frontend), §3.2 (arborescence)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel §1.3 mentionne `Tailwind CSS 4.2.4 LTS` (correct). §3.2 liste `tailwind.config.ts` dans l'arborescence frontend. Or **Tailwind 4 idiomatique** se configure dans `globals.css` via le bloc `@theme`, **pas** dans un fichier `tailwind.config.ts`. Le seul fichier nécessaire est `postcss.config.mjs` avec `@tailwindcss/postcss`.

**Proposition** :
Mettre à jour §3.2 :

```
app/
├── postcss.config.mjs       OBLIGATOIRE — { plugins: { '@tailwindcss/postcss': {} } }
├── tailwind.config.ts       OPTIONNEL — uniquement si plugins TS spécifiques
                             (typography, forms, etc.). Sinon ne pas créer.
└── src/app/globals.css      OBLIGATOIRE — @import "tailwindcss" + @theme block
                             contenant les tokens (couleurs, polices, radii, gradients)
```

Préciser en §1.3 que la configuration **par défaut** Tailwind 4 ne nécessite plus de fichier de config dédié — c'est un changement majeur vs Tailwind 3.

---

### R-05 — Convention casse pour `NEXT_PUBLIC_PRODUCT_SUFFIX`

**Statut** : Open
**Référentiel concerné** : §4.4 (Design system)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel §4.4 indique :

> _"Branding par produit via `NEXT*PUBLIC_PRODUCT*_`"\*

Mais ne précise pas la **casse** attendue. Le DS SELECT-PX affiche un wordmark `LIC_PORTAL` (uppercase, séparateur `_`). Si on utilise `NEXT_PUBLIC_PRODUCT_SUFFIX="Portal"`, le BrandLockup rend `LIC_Portal`, **incohérent avec le DS**.

**Proposition** :
Préciser en §4.4 :

```
Convention de casse :
  NEXT_PUBLIC_PRODUCT_CODE    : UPPERCASE 3-4 lettres (LIC, PHS, MON, ACQ)
  NEXT_PUBLIC_PRODUCT_NAME    : "Title Case Naturel" (Licence Manager, Phase Manager)
  NEXT_PUBLIC_PRODUCT_SUFFIX  : UPPERCASE (PORTAL, PLATFORM, TOOLBOX)
                                Cohérence wordmark : <CODE>_<SUFFIX> tout uppercase
```

---

### R-06 — Workflow Claude Code : "stop validation" aux étapes structurantes

**Statut** : Open
**Référentiel concerné** : §4.7 (Discipline IA), §4.9 (Workflow tâche)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel §4.7 demande de la prudence ("pas de réécriture totale") mais ne formalise pas un pattern explicite : à quels moments d'une phase complexe Claude Code doit s'arrêter et demander validation humaine vs continuer ?

Sur LIC v2 phase 1, on a empiriquement défini :

- **Stop court** (montrer résultat OK, pas d'examen) : actions plombières (`pnpm install`, création dossiers vides, vérification fichiers existants, lint final)
- **Stop validation** (montrer code/rendu, attendre accord) : décisions structurantes (CSS theme tokens, layout root, première page rendue)

**Proposition** :
Ajouter en §4.9 un encadré "Pattern Stop & Validate" :

```
Pour les tâches multi-étapes longues, l'agent (Claude Code) doit identifier
en début de tâche les "stops" à appliquer :

  Stop court (showing) :
    - Étapes plombières sans choix architectural
    - Affichage du résultat, attente d'un "ok continue"

  Stop validation (gating) :
    - Étapes contenant un choix de design (tokens DS, structure de layout,
      pattern de composant, signature d'API)
    - Affichage code + rendu si applicable
    - ATTENTE EXPLICITE de l'accord humain avant de continuer
```

---

### R-07 — Préciser convention nommage fichiers composants React

**Statut** : Open
**Référentiel concerné** : §4.5 (Conventions de nommage)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
§4.5 dit _"Fichiers TS kebab-case"_ sans exception. Mais la convention universelle React (et celle de shadcn/ui que le Référentiel impose en §1.3) utilise PascalCase pour les fichiers de composants. Si on suit §4.5 littéralement, on doit renommer chaque composant shadcn ajouté + se créer un mismatch permanent avec l'écosystème React (`button.tsx` qui exporte `Button`, etc.).

Exemple de divergence : `pnpm dlx shadcn@latest add button` génère `Button.tsx` ; le code de référence du DS SELECT-PX (`docs/design/index.html` ligne 824) écrit `BrandLockup` et `SpxTile` en PascalCase.

**Proposition** :
Préciser §4.5 (table des conventions) avec une distinction explicite :

```
Élément                                 Convention            Exemple
Fichier TS exportant un composant React PascalCase            Button.tsx, BrandLockup.tsx
                                        (aligné sur l'export)
Tous les autres fichiers TS / TSX       kebab-case            create-client.usecase.ts
                                                              client.repository.pg.ts
                                                              client.mapper.ts
                                                              format-currency.ts
Fichiers Next.js conventionnels         lowercase imposé      page.tsx, layout.tsx, route.ts
                                        par Next              not-found.tsx, _actions.ts
```

Test pratique : si le fichier exporte un composant React (fonction qui retourne du JSX), nom = export en PascalCase. Sinon, kebab-case.

Documenté dans LIC v2 par ADR `0008-naming-fichiers-composants-react.md`.

---

### R-08 — Pattern `.gitignore *.pem` peut masquer une route Next.js

**Statut** : Open
**Référentiel concerné** : §3.2 (standards racine), §4.17 (outillage repo)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
La règle `*.pem` dans `.gitignore` (utile pour bloquer les clés PEM en clair) matche aussi les noms de **dossiers** Next.js qui finissent par `.pem` (convention App Router : un dossier `.well-known/s2m-ca.pem/` avec `route.ts` dedans crée la route `/.well-known/s2m-ca.pem`). Sans exception explicite, le code de la route est silencieusement ignoré par Git.

Cas vécu sur LIC v2 phase 1 : le `.gitkeep` placé dans `app/src/app/api/.well-known/s2m-ca.pem/` n'apparaissait pas dans `git status --untracked-files=all`. Détection uniquement via `git check-ignore -v` qui pointe la règle `.gitignore:119:*.pem`. Le futur `route.ts` (Phase 3, ADR 0002) aurait subi le même sort sans la correction.

**Proposition** :
Référentiel §3.2 (ou §4.17), dans le `.gitignore` template officiel, ajouter une exception explicite pour les routes Next.js exposant des artefacts via un nom de dossier matching un pattern de secret :

```gitignore
*.pem
*.key
*.crt

# Exception : routes Next.js dont le nom de dossier finit par .pem/.key/.crt
# (convention App Router — ex: /.well-known/s2m-ca.pem/route.ts qui retourne
# dynamiquement le PEM ; le dossier ne contient PAS de fichier sensible en dur).
!app/src/app/api/**/*.pem/
!app/src/app/api/**/*.pem/**
```

Patterns concrets concernés sur LIC v2 :

- `/.well-known/s2m-ca.pem` (distribution clé publique CA, ADR 0002)
- éventuellement futurs `/.well-known/<x>.crt`, `/api/<y>.key/route.ts` selon les besoins inter-services

Vérification automatique recommandée à intégrer dans la CI (1 ligne) :

```sh
# Tout fichier de route attendu doit être trackable
for d in $(find app/src/app/api -type d); do
  test -f "$d/route.ts" && git check-ignore "$d/route.ts" >/dev/null \
    && { echo "ROUTE IGNORÉE PAR .gitignore: $d/route.ts"; exit 1; }
done
```

---

### R-09 — Fournir un template ADR standardisé

**Statut** : Open
**Référentiel concerné** : §3 (structure du dépôt), §4.19 (CLAUDE.md projet) — manque transverse
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
Le Référentiel impose les ADR (Architecture Decision Records) format Michael Nygard pour documenter les décisions structurantes mais ne fournit aucun template. Chaque équipe va inventer le sien (titre, ordre des sections, niveau de détail), ce qui rend les ADR cross-projets difficiles à comparer.

**Proposition** :
Ajouter dans le Référentiel un §3.3 "Templates fournis" qui inclut a minima :

- `docs/templates/adr-template.md` (Status, Context, Decision, Consequences) avec exemple court
- `docs/templates/adr-superseded-example.md` (cas d'un ADR remplacé par un autre)

Inclure dans le squelette de bootstrap obligatoire d'un nouveau projet S2M.

---

### R-10 — Formaliser PROJECT_CONTEXT.md comme CLAUDE.md

**Statut** : Open
**Référentiel concerné** : §3.2 (standards racine), §4.19 (CLAUDE.md projet)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
Le Référentiel définit `CLAUDE.md` (≤300 lignes, format imposé, sections numérotées — §4.19) et le mentionne dans l'arborescence racine. Il mentionne aussi `PROJECT_CONTEXT.md` dans §3.2 sans plus de précision : pas de plafond de lignes, pas de structure imposée, pas de règle de mise à jour. Or sur LIC v2 ce fichier fait 588 lignes et porte le cadrage métier complet — il est aussi crucial que CLAUDE.md.

**Proposition** :
Ajouter §4.19bis "PROJECT_CONTEXT.md projet" :

- Rôle : cadrage métier exhaustif (périmètre, écrans, workflows, ADR de référence) — destiné à l'humain et à Claude Code
- Plafond suggéré : 600 lignes (plus tolérant que CLAUDE.md car porte plus de contenu métier)
- Sections types : Identité projet / État d'avancement / Stack adoptée / Architecture / Structure du dépôt / Règles métier / Périmètre fonctionnel / Workflows / DEC consignées (ou pointeurs vers ADR) / Sources autorisées
- Règle de mise à jour : à la fin de chaque phase majeure (Phase 1, Phase 2, etc.)

---

### R-11 — Justifier le choix `abstract class` pour les ports

**Statut** : Open
**Référentiel concerné** : §3 (structure hexagonale), §4.11 (matrice patterns)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
§3 décrit les ports comme "interfaces (abstract class)". La convention TypeScript universelle pour décrire un contrat est `interface` (pas d'output JS, pas de cycle d'instanciation). Le choix `abstract class` est probablement motivé par le pattern DI (avoir un token concret pour `instanceof` check ou pour le DI container NestJS), mais ce n'est pas explicité.

**Proposition** :
Préciser §3 ou §4.11 :

- Pourquoi `abstract class` plutôt que `interface` (DI manuelle vs NestJS DI runtime)
- Recommander `interface` pour les projets sans NestJS (Next.js full-stack par exemple) où la DI est manuelle dans les Server Actions / use-cases — les types suffisent
- Sinon, donner un exemple concret de pattern d'instanciation et de mock de tests

---

### R-12 — Pattern "projet pilote" et stratégie de remontée vers @s2m/core-\*

**Statut** : Open
**Référentiel concerné** : §1.2 (briques @s2m/core-\*), §3 (structure)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
Le Référentiel impose des briques transverses partagées (`@s2m/core-auth`, `@s2m/core-errors`, `@s2m/core-audit`, `@s2m/core-observability`, `@s2m/select-px-design`, `@s2m/core-crypto`, `@s2m/core-rls`, etc.). En réalité ces packages **n'existent pas encore** : LIC v2 est le projet pilote qui implémente ces briques localement. Le Référentiel ne cadre pas ce cas spécifique.

Sans pattern, chaque projet pilote :

- Réinvente la structure interne des briques
- Ne signale pas explicitement qu'il fait du local en attente du package partagé
- Ne sait pas quand promouvoir une brique locale en package shared

**Proposition** :
Ajouter §1.2bis "Projets pilotes et briques transverses" :

- Définir le statut "projet pilote" (premier projet à implémenter une brique destinée à devenir partagée)
- Convention de marquage : commentaire en tête de fichier ou ADR dédié `// PILOT — sera remonté vers @s2m/core-X quand stable`
- Critères de promotion : N projets l'utilisent / API stable depuis M mois / tests à jour / documenté
- Workflow de remontée (qui décide, comment on extrait, comment on rend les projets dépendants)

---

### R-13 — Adapter §3 pour single-app Next.js full-stack

**Statut** : Open
**Référentiel concerné** : §3 (structure du dépôt)
**Phase LIC** : Phase 0 — Cadrage (validé ADR 0001)

**Constat** :
§3 impose la structure monorepo `backend/` (NestJS) + `frontend/` (Next.js). LIC v2 est single-app Next.js full-stack — Server Actions remplacent les controllers NestJS, l'arborescence est `app/src/server/modules/<X>/{domain,application,ports,adapters}` au lieu de `backend/src/...`. Ce cas est validé en ADR 0001 mais le Référentiel ne le décrit pas comme alternative légitime.

**Proposition** :
Ajouter §3bis "Variantes architecturales acceptées" :

- Variante A (par défaut) : `backend/` + `frontend/` séparés (NestJS + Next.js)
- Variante B : single-app Next.js full-stack (back-office mono-tenant, équipe ≤ 5 devs, pas d'API publique)
- Variante C : Next.js + service worker séparé (cas hybride)

Pour chaque variante, donner l'arborescence type, les équivalents fonctionnels (Server Action ≈ controller, etc.), et les contraintes (par exemple : variante B = Next.js obligatoire, monorepo avec workspace shared/, hexagonal préservé).

Toute variante autre que A doit être justifiée en ADR.

---

### R-14 — Marquer explicitement les briques optionnelles selon contexte

**Statut** : Open
**Référentiel concerné** : §1, §4.2 (règles MUST/MUST NOT)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
Plusieurs prescriptions sont posées comme universelles alors qu'elles sont contextuelles :

- **Multi-tenant + RLS** : pertinent pour SaaS multi-clients, pas pour un back-office interne mono-tenant (LIC).
- **decimal.js + montants en string** : pertinent pour transactionnel monétaire, pas pour des volumes entiers (LIC compte des TPE/GAB/cartes).
- **JWT access mémoire + refresh cookie** : pertinent pour une API publique avec clients tiers, pas forcément pour un back-office interne avec sessions cookies (Auth.js v5).
- **Redis 7** : pertinent pour high-throughput, idempotence, pub/sub. Pas indispensable pour un back-office faible trafic.
- **NATS JetStream** : idem, dépend du besoin inter-services.

LIC v2 a documenté ses écarts en ADR 0001, mais sans pattern dans le Référentiel chaque projet réinvente la justification.

**Proposition** :
Pour chaque brique transverse dans §1 et chaque règle MUST dans §4.2, ajouter un tag :

- 🟢 **Universel** : obligatoire dans tout projet S2M
- 🟡 **Contextuel** : obligatoire si [critère], sinon ADR justificatif requis
  - Exemple : "Multi-tenant + RLS — Contextuel : obligatoire si le projet sert >1 client distinct, sinon ADR requis pour acter le mono-tenant"
- 🔴 **Critique** : obligatoire toujours, écart impossible (ex: pas de `any`, pas de `console.log`, audit obligatoire)

Faciliterait l'audit conformité et clarifierait les attendus pour les projets atypiques.

---

### R-15 — Registre des projets S2M et leur statut Référentiel

**Statut** : Open
**Référentiel concerné** : transverse — §1, §3
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
S2M va déployer le Référentiel sur plusieurs projets de la suite SPX (LIC, PHS, MON, ACQ, CRD, ATM...). Aujourd'hui il n'existe pas de registre central qui :

- Liste les projets en cours
- Donne leur statut vis-à-vis du Référentiel (pilote / aligné / en migration / dérogation)
- Liste les ADR notables propres à chaque projet
- Pointe vers leur tag de release courant

Sans registre, chaque projet refait son cadrage de zéro et les apprentissages cross-projets ne circulent pas.

**Proposition** :
Créer un repo central `s2m-portfolio` (ou ajouter au repo Référentiel) un fichier `PROJECTS.md` :

- Tableau : projet, statut, équipe, version Référentiel, ADR notables, tag courant, lien repo
- Mise à jour à chaque release majeure d'un projet
- Référence dans le Référentiel §1.0

---

### R-16 — Politique de mise à jour des versions stack

**Statut** : Open
**Référentiel concerné** : §1, §3.2 (standards racine)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Le Référentiel fige des versions précises (Node 24.15.0, pnpm 9.x, Next.js 16.2.4 LTS, TypeScript 6.0.3, etc.). Mais il ne décrit pas la politique de mise à jour :

- Si Node 24.16.0 sort avec un fix sécu critique, qui décide de bumper ? Quand ?
- Bumps automatiques (Renovate) tolérés sur quels périmètres (patch / minor / major) ?
- Vitesse de propagation cross-projets (tous au même moment ? phasé ?)
- Comment annoncer un bump du Référentiel aux projets en cours ?

**Proposition** :
Ajouter §1.5 "Cycle de mise à jour stack" :

- Bumps **patch** (ex: 24.15.0 → 24.15.1) : chaque projet à sa main, via Renovate auto-merge
- Bumps **minor** (ex: 24.15 → 24.16) : décision équipe Référentiel, propagation 30j
- Bumps **major** (ex: Next 16 → Next 17) : ADR Référentiel + plan de migration documenté + N+1 release Référentiel
- Tag des releases du Référentiel (v2.0, v2.1, v2.2...) pour que les projets puissent dire "je suis aligné Référentiel v2.1"

---

### R-17 — Format standardisé "dette technique projet"

**Statut** : Open
**Référentiel concerné** : §4 (qualité), §4.19 (CLAUDE.md projet)
**Phase LIC** : Phase 0 — Cadrage (LIC v1 → v2)

**Constat** :
LIC v1 avait identifié 3 dettes techniques connues (DETTE-001 FTS audit limité, DETTE-002 force-change-password, DETTE-003 SMTP simulé). Format inventé localement, traitement en LIC v2 documenté en ADR. Chaque projet S2M va probablement créer son propre format de dette.

**Proposition** :
Ajouter §4.20 "Dette technique projet" :

- Format : `DETTE-NNN — Titre court` avec sections Cause, Impact, Solution future, Priorité (haute/moyenne/basse), Phase cible
- Stockage : `docs/dette-technique.md` à la racine du projet (ou dans `PROJECT_CONTEXT.md` selon volumétrie)
- Convention : une DETTE est levée par une issue/PR explicite, jamais silencieusement
- Distinction avec ADR : un ADR documente une **décision prise**, une DETTE documente une **limitation acceptée à corriger**

---

### R-18 — Workflow d'audit conformité Référentiel

**Statut** : Open
**Référentiel concerné** : transverse — manquant
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Aucun workflow d'audit conformité n'est défini dans le Référentiel. Sur LIC v2 phase 1, on a improvisé :

- Auto-audit interne par Claude Code (tabulaire par section Référentiel)
- Audit externe par un autre agent (à venir, sur push GitHub)

Sans workflow cadré, chaque projet va réinventer son audit avec un format différent, et il sera difficile de comparer la conformité cross-projets.

**Proposition** :
Ajouter §4.21 "Audit conformité" :

- **Périodicité** : à la fin de chaque phase majeure (bootstrap, MVP, release)
- **Méthode** : tableau par section Référentiel × statut (✅ / 🟡 / ❌ / ⚪ N/A) + évidence ligne-précise + plan de correction
- **Pratique recommandée** : double audit interne (équipe projet) + externe (agent ou pair) pour les phases critiques
- **Format de sortie** : `docs/audit/audit-phase-N.md`
- **Verdicts standardisés** : "Go phase N+1" / "Go avec corrections mineures" / "Stop, corrections nécessaires avant"

Fournir un template `docs/templates/audit-template.md` avec les sections Référentiel pré-remplies.

---

### R-19 — eslint-plugin-boundaries ne filtre pas par nom de dossier

**Statut** : Open
**Référentiel concerné** : §4.11 (matrice patterns autorisés), §4.17 (outillage)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
§4.11 interdit les dossiers `services/`, `helpers/`, `utils/`, `lib/`, `common/`, `managers/` à l'intérieur de `app/src/server/modules/<X>/`. La règle est légitime (ces noms cachent des fourre-tout anti-hexagonal).

Mais `eslint-plugin-boundaries` (l'outil prescrit pour enforcer l'hexagonal) filtre par **type de couche** (`domain`, `application`, `ports`, `adapters`) et **non pas par nom de dossier**. Un dev pourrait créer `app/src/server/modules/client/utils/anything.ts` sans aucune erreur ESLint.

LIC v2 phase 1 a comblé ce trou avec une règle `no-restricted-imports` ad hoc, mais c'est artisanal.

**Proposition** :
Préciser §4.17 :

- Règle ESLint complémentaire à `eslint-plugin-boundaries` : `no-restricted-imports` (ou `eslint-plugin-no-restricted-paths`) avec patterns explicites pour les noms interdits dans `modules/<X>/`
- Fournir la config-type prête à coller dans `eslint.config.mjs`
- Idéalement, étendre `eslint-plugin-boundaries` lui-même avec un type "forbidden" (voire un fork S2M)

---

### R-20 — Gestion des bumps majors avec peer deps désynchronisées

**Statut** : Open
**Référentiel concerné** : §1, §4.17 (outillage)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
Lors du bootstrap LIC v2 (Next.js 16 + React 19), plusieurs deps de l'écosystème accusent un retard :

- `next-auth@5.0.0-beta.25` exige `next@^14 || ^15` (warning peer dep avec next 16)
- `@auth/core@0.41.2` exige `nodemailer@^7.0.7` (alors que `nodemailer@6` est installé)

Ces warnings sont normaux sur un major bump récent mais peuvent être ignorés à tort, ou créer des bugs runtime subtils.

**Proposition** :
Ajouter §4.17 "Gestion des peer deps lors de bumps majors" :

- À chaque bump major dans le Référentiel, lister explicitement les peer deps désynchronisées attendues et leur résolution prévue (date / version cible)
- Convention de tracking : `docs/peer-deps-tracker.md` dans chaque projet, avec colonnes paquet / version actuelle / version Référentiel / version compatible attendue / phase de résolution
- Renovate config alignée pour ne pas bumper avant disponibilité

---

### R-21 — Convention pour les liens cross-repos S2M

**Statut** : Open
**Référentiel concerné** : §3.2 (standards racine), §1.2 (briques)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
Lorsqu'un projet S2M référence le Référentiel, le DS, ou des specs d'intégration cross-projets (F2_FORMATS, etc.), il n'existe pas de convention :

- LIC v2 a copié le PDF du Référentiel + fait une extraction txt locale (`docs/REFERENTIEL_S2M.pdf` + `.txt`) — fonctionnel mais expose à des dérives de version
- Le DS est copié localement (`docs/design/index.html`) plutôt que consommé via npm interne (qui n'existe pas)

Sans convention, chaque projet diverge silencieusement et les mises à jour ne se propagent pas.

**Proposition** :
Ajouter §3.4 "Liens cross-repos S2M" :

- Référentiel : copie locale tag-versionnée dans `docs/referentiel/` avec fichier `VERSION` qui contient le tag (ex: `v2.0.0`). Mise à jour explicite par PR, jamais en silence.
- Design System : consommation via npm interne `@s2m/select-px-design` quand disponible, sinon copie locale dans `docs/design/` avec même mécanisme `VERSION`.
- Specs cross-projets : tags Git, importés dans `docs/integration/<repo>/`.
- Renovate ne couvre pas ces dépendances "en doc" — ajouter un check CI manuel ou mensuel.

---

### R-22 — Templates Server Actions Next.js manquants en §4.12

**Statut** : Open
**Référentiel concerné** : §4.12 (templates code obligatoires)
**Phase LIC** : Phase 0 — Cadrage

**Constat** :
§4.12 fournit 6 templates obligatoires (use-case, port, adapter, mapping, controller HTTP, tests). Le template "controller HTTP" est basé NestJS (`@Controller`, `@Get`, `@Post`, etc.).

Pour les projets Next.js full-stack (variante B en R-13), l'équivalent fonctionnel est la **Server Action** (fichier `_actions.ts` co-localisé). Le pattern est différent : signature `'use server'`, validation Zod inline, appel use-case, `revalidatePath`, gestion d'erreurs typées convertibles côté client.

Sans template Next.js de référence, chaque dev invente sa structure et l'audit conformité est imprécis.

**Proposition** :
Ajouter à §4.12 un template "Server Action Next.js" avec :

- Signature `'use server'` + nommage `<verb><Entity>Action`
- Validation Zod en première instruction
- Vérification de rôle `requireRole(...)` si applicable
- Appel use-case `await usecase.execute(input)`
- `revalidatePath` ou `revalidateTag` après mutation
- Mapping erreurs domaine → erreurs client (`ActionResult<T>` discriminated union)
- Audit log dans la même transaction que la mutation

Exemple court avec une mutation simple (ex: `updateLicenceCommentAction`).

---

### R-23 — Architecture next-intl à cadrer

**Statut** : Open
**Référentiel concerné** : §1.3 (frontend), §4.16 (i18n)
**Phase LIC** : Phase 1 — Bootstrap

**Constat** :
§1.3 prescrit `next-intl 4.x` et §4.16 dit "EN+FR par défaut, RTL géré nativement". Mais l'architecture concrète d'intégration n'est pas spécifiée :

- Middleware `next-intl/middleware` ou pas ?
- Structure `messages/<locale>.json` flat ou nested ?
- Convention de namespacing par module ou par écran ?
- Stratégie de fallback (clé manquante en EN si FR est la source de vérité) ?
- Comment gérer le SSR avec `getRequestConfig` ?

Chaque projet va réinventer le pattern, ce qui rend la consolidation cross-projets douloureuse.

**Proposition** :
Ajouter §4.16bis "Architecture next-intl" avec une recommandation cadrée :

- Middleware activé pour gestion locale via cookie + URL prefix optionnel
- Structure : `app/src/i18n/messages/{fr,en}.json` flat, namespaces par module métier (`{module}.{key}`)
- Source de vérité : FR (les libellés français sont les plus précis pour les contextes métier MA/TN/CI)
- Fallback : EN si clé manquante, log warn en dev
- Convention de naming : `{module}.{action}.{result}` (ex: `licence.create.success`)
- Tests : un test snapshot par fichier de traduction pour détecter les clés manquantes

---

_Fin de l'archive. Capitalisation close en Mai 2026._

---

## Cycle v2.2+ — Phase 2.B+

> Entrées issues de LIC v2 Phase 2.B. Non intégrées au Référentiel v2.1.
> À soumettre pour v2.2+.

### R-24 — Schéma dans module sans `application/`/`ports/`/`domain/` (§4.11 silent)

- **Type** : Convention manquante / cas transitoire
- **Phase LIC** : Phase 2.B étape 1/7
- **Contexte** : Le Référentiel §4.11 prescrit la structure `domain/`/`application/`/`ports/`/`adapters/` pour tout module métier, et interdit `services/helpers/utils/lib/common/managers`. Mais il ne traite pas le **cas transitoire** où un module est créé pour son schéma BD seul (ex: référentiels paramétrables livrés avant leurs use-cases — Phase 2.B livre 6 schémas en étape 1, les modules complets viennent étapes 2-7). Sans guidance, deux écueils possibles : (a) créer un `<X>.module.ts` qui ne fait que ré-exporter le schéma — ce qui est une coquille vide ET viole la règle ESLint `module-root → module-schema` (cf. R-25), (b) reporter la création du dossier module et placer le schéma ailleurs (`infrastructure/db/schema/`, `shared/`, …) — ce qui pollue les dossiers transverses.
- **Décision LIC v2** : Créer **uniquement** `modules/<X>/adapters/postgres/schema.ts` à l'étape "tables". Aucun `<X>.module.ts`, aucun `domain/`, aucun `application/`, aucun `ports/`. Le `<X>.module.ts` sera créé à l'étape suivante avec sa vraie surface (singletons repository, use-cases). Documenté dans `app/CLAUDE.md` section « Schéma seul — cas transitoire ».
- **Reco évolution Référentiel v2.2+** : Ajouter en §4.11 une note explicite : _« Pour un module créé pour son schéma BD avant ses use-cases, seul `adapters/postgres/schema.ts` doit exister. Ne pas créer de `<X>.module.ts` qui se contenterait de ré-exporter le schéma — il sera créé à la phase suivante. »_

---

### R-25 — Surface schéma cross-module : barrel `infrastructure/db/schema/index.ts`, **pas** `<X>.module.ts`

- **Type** : Clarification de pattern (réinterprétation d'une divergence apparente)
- **Phase LIC** : Phase 2.B étape 1/7
- **Contexte** : `eslint-plugin-boundaries` LIC v2 déclare un type `module-schema` qui matche `modules/*/adapters/postgres/schema.ts` (eslint.config.mjs:55-57). La règle pour `module-root` (eslint.config.mjs:158-169) **n'autorise pas** `module-schema` dans son `allow:` — donc `<X>.module.ts` ne peut pas importer son propre `schema.ts` directement. Tentation initiale : ajouter `module-schema` à l'allow-list de `module-root`. Inutile : l'agrégation Drizzle Kit + runtime se fait par `infrastructure/db/schema/index.ts` (couple `infrastructure → module-schema` autorisé en eslint.config.mjs:178). Le `<X>.module.ts` n'a jamais besoin de connaître son schéma — il manipule des repositories qui passent par les adapters (couple `module-root → adapters` autorisé) qui eux-mêmes importent le schéma (couple `adapters → module-schema` autorisé en eslint.config.mjs:154).
- **Décision LIC v2** : La **surface schéma cross-module passe par le barrel `infrastructure/db/schema/index.ts`**, jamais par les `<X>.module.ts`. Aucune modif ESLint requise pour la Phase 2.B.
- **Reco évolution Référentiel v2.2+** : Documenter explicitement en §3 ou §4.13 le rôle du barrel infrastructure schema vs le module-root. Le `<X>.module.ts` est composition root **applicative** (singletons use-cases + repositories), pas surface BD.

---

### R-26 — Divergence ADR 0005 `uuidv7` → PK `serial` sur référentiels paramétrables

- **Type** : Divergence justifiée + élargissement de la règle ADR 0005
- **Phase LIC** : Phase 2.B étape 1/7
- **Contexte** : ADR 0005 fixe `uuidv7` PK pour **toutes** les tables LIC v2. Or les 6 tables référentielles paramétrables (régions/pays/devises/langues/types-contact/team-members) ont un identifiant business stable (`region_code`, `code_pays` ISO, `code_devise` ISO, etc.) — les FK reçues pointent vers ce code logique, jamais vers l'`id`. Les bénéfices `uuidv7` (non-énumérabilité, génération distribuée, future-proof réplication) ne s'appliquent pas à des codes ISO publics par construction. À l'inverse, `uuidv7` ajoute du bruit dans les seeds, dans Drizzle Studio et dans les rapprochements ISO.
- **Décision LIC v2** : PK `serial` exclusivement pour ces 6 tables — actée dans **ADR 0017** (`docs/adr/0017-pk-serial-referentiels-parametrables.md`). Toutes les autres tables LIC v2 conservent `uuidv7` (ADR 0005 inchangé).
- **Reco évolution Référentiel v2.2+** : Le Référentiel §4.15 (ou équivalent) devrait reconnaître la catégorie **« table référentielle paramétrable / enum versionnable BD »** comme exception légitime à la règle PK uuid (codes business stables, FK par code logique, volume <200 lignes, lecture seule pour le métier). Sans ça, chaque projet SPX devra écrire son propre ADR 0017-équivalent.

---

### R-27 — Règle audit §4.2 — exception référentiels paramétrables

- **Type** : Exception à la règle "audit obligatoire sur toute mutation" + cohérence avec ADR 0017
- **Phase LIC** : Phase 2.B étape 2/7
- **Contexte** : Le Référentiel §4.2 (rappelé en CLAUDE.md "MUST appeler `auditLog.record()` dans la même transaction que toute mutation métier") prescrit l'audit obligatoire pour TOUTE mutation. Or les 6 référentiels paramétrables (régions/pays/devises/langues/types-contact/team-members) :
  1. Ont une PK `serial` (ADR 0017) **incompatible** avec `lic_audit_log.entity_id uuid NOT NULL` — l'INSERT auditrait avec `String(region.id) = "1"` qui lèverait `invalid input syntax for type uuid`.
  2. Sont éditées par le SADMIN seul via `/settings`, volume <200 lignes, traçabilité implicite via `dateCreation`.
  3. Migrer `entity_id` en `varchar(50)` pour les supporter = dette structurelle disproportionnée pour 6 tables CRUD basiques.
- **Décision LIC v2** : Aucun audit sur les 6 modules référentiels paramétrables. Le carve-out est explicite dans ADR 0017 §Consequences ("les référentiels paramétrables ne sont jamais audités directement"). Conséquence dans le code :
  - Les use-cases `Create*`/`Update*`/`Toggle*` ref n'injectent PAS `AuditRepository`
  - Les use-cases mutants ref sont câblés directement dans `<X>.module.ts` (pas via `composition-root.ts`) puisqu'ils n'ont pas de dépendance cross-module audit
  - Les use-cases mutants ref n'ouvrent PAS de `db.transaction()` interne (la transaction servait à garantir audit-dans-la-même-tx). La cohérence pour create est fournie par la contrainte UNIQUE BD.
- **Reco évolution Référentiel v2.2+** : Le Référentiel §4.2 devrait préciser la **catégorie d'entités exclues de l'audit obligatoire** : référentiels paramétrables / enums versionnables BD à volume figé + PK serial. Sans cette précision, chaque projet SPX devra écrire son propre ADR équivalent à 0017.

---

### R-28 — `setupTransactionalTests` incompatible avec `db.transaction()` interne du use-case

- **Type** : Limitation documentée du pattern de test Phase 2.A + clarification d'usage
- **Phase LIC** : Phase 2.B étape 2/7
- **Contexte** : Le helper `app/src/server/infrastructure/db/test-helpers.ts:setupTransactionalTests` enveloppe chaque test dans `BEGIN ... ROLLBACK` sur `ctx.sql`. Le commentaire en ligne 49-50 promet : _« Drizzle `db.transaction()` au sein d'un test → SAVEPOINT (transaction imbriquée), également annulé par le ROLLBACK racine. »_ En pratique cette promesse n'est tenue **que si l'appel `db.transaction()` est issu d'une fonction qui voit déjà la transaction racine via l'AsyncLocalStorage de Drizzle**. Lorsque le use-case appelle `db.transaction()` à plat (top-level depuis le point de vue Drizzle, même si on est dans un BEGIN manuel postgres-js), Drizzle émet un nouveau `BEGIN ... COMMIT` qui **commit définitivement** la transaction racine du test → fuites cross-tests observées en étape 2 (8 régions `TEST_*` accumulées en BD avant débogage).
- **Décision LIC v2** : Documenter la règle dans `app/CLAUDE.md` :
  1. `setupTransactionalTests` fonctionne pour les tests de **repository** (qui n'ouvrent jamais `db.transaction()` interne — pattern audit Phase 2.A) et pour les tests de **use-case sans transaction interne** (cas référentiels Phase 2.B post-R-27).
  2. Pour les use-cases qui ouvrent `db.transaction()` interne (audit obligatoire dans la même tx), basculer sur **TRUNCATE+reseed** dans `afterEach` (pattern `change-password.usecase.spec.ts` Phase 2.A).
- **Reco évolution Référentiel v2.2+** : Le commentaire de `test-helpers.ts:49-50` est trompeur en l'état. Soit corriger le commentaire pour mentionner la condition (« uniquement si la transaction interne est ouverte par un caller déjà dans la transaction racine Drizzle »), soit faire évoluer le helper pour réserver une connexion postgres-js dédiée et exposer une API `withTestTx(test => ...)` qui force tous les `db.transaction()` à utiliser la connexion réservée. À traiter en F-13+ (refactor tests d'intégration).

---

### R-29 — Isolation seed dev vs BD de tests d'intégration

- **Type** : Zone floue / règle manquante
- **Phase LIC** : Phase 2.B étape 5/7
- **Contexte** : Le Référentiel §4.2 prescrit `setupTransactionalTests` (BEGIN/ROLLBACK) pour l'isolation des tests d'intégration BD. Mais il ne traite pas le cas où une BD locale dev contient des données seedées (via `pnpm db:seed`) qui survivent au ROLLBACK et cassent les assertions de count/contenu (23 tests cassés confirmés en Phase 2.B étape 5 — la bascule "seed → tests" rend le suite rouge sans modification de code, simplement parce que les comptes attendus en bootstrap ne correspondent plus).
- **Décision LIC v2** : Le seed dev est strictement séparé des migrations CI. Avertissement explicite en tête de `seed.ts` (« DEV / DÉMO UNIQUEMENT — NE PAS LANCER SUR LA BD UTILISÉE PAR LES TESTS »). La BD de tests doit être en état bootstrap-only (drop + migrate sans seed). Documenté dans `app/CLAUDE.md` section « Tests d'intégration use-case ».
- **Reco évolution Référentiel v2.2+** : Ajouter en §4.2 : _« Le script seed dev ne doit jamais être exécuté sur la BD utilisée par les tests d'intégration. Les tests sont écrits contre l'état post-migrations uniquement. »_

---

### R-33 — `clientId` audit nécessite `clientDisplay` (validation AuditEntry)

- **Type** : Couplage AuditEntry → résolution display (round-trip) ; clarification
- **Phase LIC** : Phase 4 étape 4.C
- **Contexte** : `AuditEntry.create()` (audit/domain/audit-entry.entity.ts:155-159) impose `clientDisplay !== undefined` quand `clientId !== undefined`. Légitime côté lisibilité audit, mais oblige le caller à effectuer un round-trip BD (`clientRepository.findById(clientId)`) juste pour formatter `${codeClient} — ${raisonSociale}`. Pour les use-cases entite/contact, je n'ai pas le client en main (juste son `clientId`), donc fournir `clientDisplay` impose ce round-trip systématique.
- **Décision LIC v2** : `clientId` **omis** des AuditEntry entite/contact 4.C. Le clientId reste tracé indirectement :
  - Pour entite : via `afterData.clientId` dans `entite.toAuditSnapshot()`, ou via `entityId` (qui est l'entiteId) → `lic_entites.client_id` en JOIN audit query.
  - Pour contact : via `entityId` → `lic_contacts_clients.entite_id` → `lic_entites.client_id` (2 JOIN).
- **Impact pratique** : recherche `WHERE audit.client_id = X` ne capture pas les actions sur entite/contact. Acceptable pour 4.C (recherches FTS textuelles via `search_vector` couvrent les noms). À reconsidérer si la Phase 7 (Journal des modifications EC-06) requiert le filtre direct par client.
- **Reco évolution Référentiel v2.2+** : soit (a) rendre `clientDisplay` optionnel quand `clientId` est fourni (et générer un fallback `<unresolved>`), soit (b) imposer un helper `resolveClientDisplay(clientId)` côté infrastructure pour éviter le round-trip explicite côté use-case. Préférence pour (a) — simple, sans coupler audit à un repo externe.

---

### R-34 — `server-only` empêche l'usage des repositories en CLI tsx

- **Type** : Limitation infra cross-runtime (Next.js Webpack vs tsx Node CLI)
- **Phase LIC** : Phase 4 étape 4.D
- **Contexte** : Le seed démo Phase 4 doit passer par les **repositories** (pas SQL brut, brief). Mais `infrastructure/db/client.ts` importe `"server-only"` (sentinel Next.js anti-fuite client). Le package npm `server-only` exporte une condition `react-server` qui pointe vers `empty.js` (no-op), tandis que la `default` export throw immédiatement. Sous Next.js, le bundler injecte la condition. Sous tsx CLI (db:seed), Node n'active pas la condition par défaut → throw au module load, le seed crashe avant de toucher le code.
- **Décision LIC v2** : `db:seed` script invoqué avec **`tsx --conditions=react-server`** (flag Node natif `-C`). Force l'utilisation de `empty.js`. Modification minimale dans `package.json:20`. Dépendance `server-only` ajoutée explicitement (était transitive Next.js auparavant).
- **Reco évolution Référentiel v2.2+** : §1.2 / §4.4 devrait mentionner que **tout script CLI hors Next.js qui consomme des repositories serveur** doit activer la condition `react-server` (ou stub `server-only`). Sans cette précision, chaque projet S2M va découvrir le piège à son premier seed/job CLI consommant des repositories.

---

### R-35 — Détection unique_violation Postgres : inspecter `err.cause.code`, pas `err.message`

- **Type** : Pattern technique Drizzle / postgres-js à standardiser
- **Phase LIC** : Phase 6 étape 6.D
- **Contexte** : Drizzle wrappe les erreurs natives `postgres.js` dans une `Error` dont le `.message` commence par `"Failed query: insert into ..."` — **sans contenir le mot-clé "unique"**. La `PostgresError` originale (avec `code === '23505'` SQLSTATE unique_violation) est attachée en `err.cause`. Le pattern naïf `if (/unique/i.test(err.message))` (utilisé en Phase 5 sur `create-licence.usecase.ts`) ne capture pas le cas et propage une `Error` non-typée au caller.

  Phase 6.D `RecordVolumeSnapshotUseCase` a hit ce piège : test `SPX-LIC-754` échoué jusqu'à introduction de `isUniqueViolation()` qui inspecte `err.cause.code === '23505'` AVANT de retomber sur `err.message`.

- **Décision LIC v2** : Helper local par module quand le use-case dépend de la détection :

  ```ts
  function isUniqueViolation(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    if (/unique/i.test(err.message)) return true; // legacy fallback
    const cause = (err as { cause?: unknown }).cause;
    if (cause === undefined || cause === null) return false;
    if (
      typeof cause === "object" &&
      "code" in cause &&
      (cause as { code?: unknown }).code === "23505"
    )
      return true;
    if (cause instanceof Error && /unique/i.test(cause.message)) return true;
    return false;
  }
  ```

  Le test sur `err.message` reste en premier pour compatibilité avec d'éventuels chemins (raw SQL tagged template, postgres-js direct sans Drizzle wrap) où le message contient "unique" en clair.

- **Reco évolution Référentiel v2.2+** : Promouvoir ce helper en **utilitaire infrastructure partagé** (`infrastructure/db/pg-errors.ts`) avec exports `isUniqueViolation`, `isForeignKeyViolation` (`23503`), `isCheckViolation` (`23514`), etc. Documenter le pattern de wrap Drizzle en §4.4. Évite que chaque module re-découvre indépendamment le piège (déjà observé Phase 5 → Phase 6, va se reproduire dès qu'on multiplie les conflits métier).

---

### R-36 — Jobs pg-boss : acteur SYSTEM + bypass use-case L4 acceptable

- **Type** : Pattern d'architecture jobs / acteur système à standardiser
- **Phase LIC** : Phase 8 étape 8.C
- **Contexte** : Les jobs `pg-boss` non-interactifs (cron `expire-licences`, `snapshot-volumes`, `check-alerts`) doivent muter de l'état métier **sans actorId humain** disponible. Deux exigences contradictoires apparaissent :
  1. **Règle L3 (audit obligatoire)** : toute mutation métier doit générer une entrée d'audit dans la même transaction.
  2. **Règle L4 (optimistic locking via `expectedVersion`)** : `ChangeLicenceStatusUseCase` exige un `actorId` interactif + `expectedVersion` lu côté client — incompatible avec un job batch qui itère en bulk sans round-trip UI.

  Le réflexe naïf est de **bypass complètement** l'audit ("c'est un job, pas un humain") — ce qui casse la règle L3 et rend la chronologie d'audit incomplète (un statut peut passer ACTIF → EXPIRE sans trace pour l'opérateur EC-06).

- **Décision LIC v2** : Pattern **« bypass use-case + maintien audit »** pour les jobs non-interactifs :
  - Bypass autorisé du use-case mutateur quand sa surface impose `expectedVersion` ou un `actorId` interactif → SQL UPDATE direct dans le handler.
  - Audit **obligatoire maintenu** avec acteur SYSTEM :
    - `userId = SYSTEM_USER_ID` (uuid nil seedé en migration 0000)
    - `userDisplay = SYSTEM_USER_DISPLAY` (`"Système (SYS-000)"`)
    - `mode = 'JOB'`
    - **action distincte** du verbe interactif (ex: `LICENCE_EXPIRED_BY_JOB` vs `LICENCE_EXPIRED`) pour permettre à EC-06 de filtrer "transitions automatiques" vs "actions manuelles".
  - 1 audit par row mutée (pas un seul audit agrégé), pour préserver la traçabilité fine côté EC-06 (drill-down avant/après par licence).
  - Implémenté dans `app/src/server/jobs/handlers/expire-licences.handler.ts` Phase 8.C.

- **Reco évolution Référentiel v2.2+** : Ajouter en §4.6 (Jobs / Workers) une sous-section **« Acteur SYSTEM et patterns de mutation batch »** :
  1. Tout projet S2M doit seeder un user `SYS-000` (uuid nil ou figé) en migration `0000`.
  2. Les jobs muteurs doivent émettre des entrées d'audit avec `userId=SYSTEM_USER_ID`, `mode='JOB'`, et un verbe d'action **suffixé `_BY_JOB`** ou un préfixe identifiable.
  3. Bypass des use-cases mutateurs L4 autorisé si et seulement si l'audit est explicitement régénéré côté job (pas de bypass silencieux).

---

### R-37 — Audit `entity_id` est `uuid` (pas `text`) — casts explicites dans sous-requêtes scope

- **Type** : Précision de typage du template AuditEntry
- **Phase LIC** : Phase 7 étape 7.A
- **Contexte** : Le module `audit-query` (Phase 7) a besoin de filtrer le journal selon des **scopes multi-entités** : "tous les audits qui touchent un client X" inclut audit direct sur le client + audits indirects sur ses entités/contacts/licences/renouvellements/liaisons. La requête utilise des sous-requêtes type `WHERE audit.entity_id IN (SELECT id FROM lic_entites WHERE client_id = X)`.

  Comme `lic_audit_log.entity_id` est typé **`uuid`** côté schéma Drizzle (cf. `audit/adapters/postgres/schema.ts:25`), tout SQL templated qui :
  - Compare `entity_id = '<string>'` sans cast → `operator does not exist: uuid = text` (SQLSTATE 42883)
  - Sous-requête retournant `id::text` → même erreur de mismatch types

  Drizzle query builder gère le cast automatiquement via `eq(auditLog.entityId, value)` ; mais **dès qu'on bascule en `sql\`...\``** template (cas multi-OR scope), le cast doit être explicite : `${literal}::uuid` côté valeur, et `SELECT id FROM ...` (sans `::text`) côté sous-requête.

- **Décision LIC v2** : Casts `::uuid` explicites systématiques dans `audit-query.repository.pg.ts` (Phase 7.A). Sous-requêtes retournent des `uuid` natifs (pas des `text`).

- **Reco évolution Référentiel v2.2+** : §4.12 (template AuditEntry) doit préciser explicitement :
  - **`entity_id` est typé `uuid`** côté BD (pas `text` ni `varchar`), pour s'aligner sur les PK uuidv7 des entités métier (ADR 0005).
  - Quand on écrit du SQL template `sql\`...\``qui croise`audit_log`avec d'autres tables, **caster les littéraux en`::uuid`** et **NE PAS** caster les `id`des entités cibles en`::text`.
  - Documenter comme règle critique car l'erreur Postgres 42883 ne survient qu'à l'exécution avec un message peu explicite ("operator does not exist: uuid = text") qui peut faire perdre du temps en debug.

---

### R-38 — `db.execute()` Drizzle ne parse pas TIMESTAMPTZ → cast Date manuel

- **Type** : Pattern technique Drizzle / postgres-js à standardiser
- **Phase LIC** : Phase 9 étape 9.C (job auto-renew-licences)
- **Contexte** : Drizzle expose deux APIs pour exécuter une requête SELECT :
  1. **`db.select().from(table)`** — query builder typé, **parse automatique** des colonnes selon le schéma Drizzle (`timestamp` PG → `Date` JS, `jsonb` → objet typé, `uuid` → string, etc.).
  2. **`db.execute(sql\`...\`)`** — exécution raw SQL via tagged template, **bypass du parse** : les colonnes temporelles `TIMESTAMPTZ` reviennent en **string ISO** (postgres-js le format par défaut), pas en `Date`. Pareil pour les autres types non triviaux.

  Phase 9.C `auto-renew-licences.handler.ts` a hit ce piège : la requête `db.execute<EligibleLicenceRow>(sql\`SELECT l.id, l.date_fin FROM lic_licences l WHERE...\`)`retourne`row.date_fin`en string. L'appel`row.date_fin.getTime()`plus loin throw`TypeError: debut.getTime is not a function`.

- **Décision LIC v2** : Cast manuel obligatoire à la frontière `db.execute()` :

  ```ts
  // Pattern défensif quand on bascule sur sql template raw :
  const newDebut = row.date_fin instanceof Date ? row.date_fin : new Date(row.date_fin);
  ```

  À privilégier : **`db.select()` avec schéma Drizzle typé** (parse auto). Le `db.execute()` reste utile pour les requêtes SQL complexes (JOIN multi-OR scope audit Phase 7.A, RETURNING UPDATE Phase 8.C `expire-licences`), mais alors **caster systématiquement** les colonnes temporelles à la sortie.

- **Reco évolution Référentiel v2.2+** : Ajouter en §4.11 (Drizzle / Adapters) un encart **« API Drizzle : query builder vs `db.execute()` »** précisant :
  1. Préférer `db.select().from(table).where(...)` chaque fois que la requête est exprimable en query builder (parse auto, types stricts).
  2. `db.execute(sql\`...\`)`uniquement quand le query builder ne suffit pas (sous-requêtes complexes, RETURNING UPDATE, expressions non supportées). **Cast manuel à la sortie** pour :`TIMESTAMPTZ`→`Date`, `JSONB`→ typage explicite via`as`, `NUMERIC`→`number`ou`string` selon stratégie projet.
  3. Documenter comme règle critique car le bug ne se voit qu'à l'exécution (TypeScript ne peut pas vérifier les types de retour de `sql\`...\`` sans annotation manuelle).
