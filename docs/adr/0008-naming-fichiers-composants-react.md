# 0008 — Convention de nommage des fichiers de composants React

## Status

Accepted — Mai 2026

## Context

Le Référentiel Technique S2M v2.0 (§4.5 — Conventions de nommage) prescrit `kebab-case` pour tous les fichiers TS, sans exception explicite. Appliqué littéralement, cela donnerait :

```
app/src/components/brand/spx-tile.tsx       export function SpxTile() {}
app/src/components/brand/brand-lockup.tsx   export function BrandLockup() {}
app/src/components/ui/button.tsx            export function Button() {}
```

Or, l'écosystème React et l'outillage que LIC v2 doit utiliser produisent et imposent du `PascalCase` pour les fichiers de composants :

- **shadcn/ui** (Référentiel §1.3) : `pnpm dlx shadcn@latest add button` génère `Button.tsx` (pas `button.tsx`). Tous les composants Radix-based de la galerie shadcn suivent cette convention.
- **Design system SELECT-PX** (`docs/design/index.html` ligne 824) : le code de référence du DS écrit `BrandLockup`, `SpxTile`, et le pattern d'import implicite est `import { BrandLockup } from "./BrandLockup"`.
- **Convention universelle React** : la quasi-totalité des codebases React, des templates Next.js officiels, des bibliothèques tierces (Tailwind UI, MUI, Mantine, Chakra, Ariakit…) nomment leurs fichiers de composants `PascalCase.tsx`.

Suivre §4.5 à la lettre forcerait soit :

1. Renommer chaque fichier généré par shadcn (effort + risque de désync à chaque mise à jour),
2. Maintenir un mismatch permanent entre nom de fichier et nom de composant exporté (mauvais signal),
3. Créer un alias par fichier (`button.tsx` qui exporte `Button` — fonctionne mais cosmétique inutile).

Aucune des trois options n'apporte de valeur. Le bénéfice prétendu de `kebab-case` (cohérence avec les noms de tables, routes REST, etc.) ne s'applique pas ici : un fichier de composant n'a pas de "nom canonique" externe, son nom matche son export par construction.

## Decision

LIC v2 adopte la **convention React universelle** pour les fichiers de composants :

| Type de fichier                                                                          | Convention                                            | Exemple                                                                                                                               |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Fichier exportant un composant React (`.tsx` avec `export function/default <Component>`) | **PascalCase** aligné sur le nom du composant exporté | `BrandLockup.tsx`, `SpxTile.tsx`, `Button.tsx`, `JsonDiff.tsx`                                                                        |
| Tous les autres fichiers TS / TSX                                                        | **kebab-case** (Référentiel §4.5)                     | `create-client.usecase.ts`, `client.repository.pg.ts`, `client.mapper.ts`, `client.schema.ts`, `format-currency.ts`, `next.config.ts` |
| Fichiers Next.js conventionnels                                                          | **lowercase** imposé par Next                         | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `_actions.ts`, `_components/`, `globals.css`       |

Le test pratique : si le fichier exporte un composant React (fonction qui retourne du JSX), son nom = son export en PascalCase. Tous les autres fichiers (use-cases, repositories, mappers, schemas, configs, utilitaires) restent en kebab-case.

S'applique partout dans `app/src/components/`, `app/src/app/(*)/_components/`, et toute future couche frontend qui produit des composants React.

## Consequences

**Bonnes**

- Compatibilité native avec `pnpm dlx shadcn@latest add ...` — pas de renommage manuel.
- Alignement avec le code de référence du DS SELECT-PX (`docs/design/index.html`).
- Lecture naturelle pour tout développeur React : nom de fichier = nom du composant.
- Aucun ambiguïté entre fichier composant et fichier helper/use-case (qui restent kebab-case).
- Imports auto-complétés correctement par les IDE (le nom du fichier matche l'export).

**Mauvaises**

- Écart documenté vs Référentiel §4.5 littéral. Remonté dans `docs/referentiel-feedback.md` (R-07) pour précision dans une version v3.0 du Référentiel.
- Hétérogénéité de casse au sein d'un même dossier (ex: `app/src/components/brand/` contient `BrandLockup.tsx` et pourrait contenir demain `brand-config.ts` si on extrait une constante non-composant). Acceptable car la règle est claire (PascalCase ⇔ composant).

**Neutres**

- Le linter ESLint `@typescript-eslint/naming-convention` actuel autorise `format: ["camelCase","PascalCase"]` pour les fonctions exportées — aucune règle additionnelle nécessaire pour valider l'export. La convention de nommage de fichier n'est pas (et n'a pas vocation à être) enforcée par ESLint mais par revue de code et cette ADR.
- Si un projet S2M ultérieur décide différemment, l'ADR ne s'applique qu'à LIC v2. Une décision globale sera consignée dans v3.0 du Référentiel.
