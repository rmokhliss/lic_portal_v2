# Référentiel S2M — Remontées capitalisées par LIC v2

> Document de **capitalisation continue** des points à améliorer dans le Référentiel Technique S2M v2.0, identifiés pendant la mise en œuvre de LIC v2 (projet pilote).
>
> **Méthode** : on consigne ici **au fil de l'eau** chaque remarque issue de la pratique, sans modifier le Référentiel. À la fin du projet (ou à un jalon majeur), on regroupe et on transmet **en bloc** à l'équipe Référentiel pour intégration en v3.0.
>
> **Format** : `R-NN` = remarque numérotée. Statut `Open` (à traiter), `Acknowledged` (équipe Référentiel a vu), `Integrated` (corrigé en v3.0), `Wontfix` (rejeté avec motif).

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
> *"Branding par produit via `NEXT_PUBLIC_PRODUCT_*`"*

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

## Remarques résolues / intégrées

*(vide pour le moment — sera rempli au fur et à mesure que l'équipe Référentiel acquitte ou intègre)*

---

## Format pour ajouter une nouvelle remarque

Quand un nouveau point apparaît au cours d'une phase, ajouter ci-dessous :

```markdown
### R-NN — Titre court

**Statut** : Open
**Référentiel concerné** : §X.Y (Section)
**Phase LIC** : Phase N — Nom

**Constat** :
Description du problème rencontré ou de la lacune identifiée.

**Proposition** :
Action concrète à intégrer dans le Référentiel v3.0.
```

---

## Méthode de remontée à l'équipe Référentiel

À la fin du projet LIC v2 (ou à un jalon majeur, à arbitrer) :
1. Relire ce fichier dans son intégralité
2. Filtrer les remarques `Open` (les autres sont déjà traitées)
3. Présenter en bloc à l'équipe Référentiel avec des exemples concrets tirés du repo LIC v2
4. Itérer pour clarifier les points si besoin
5. Mettre à jour les statuts au retour de l'équipe Référentiel
