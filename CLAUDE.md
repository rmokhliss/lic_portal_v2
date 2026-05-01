# CLAUDE.md — s2m-lic (LIC v2)

> Document lu en **début de chaque session** par Claude Code (Référentiel §4.1).
> Format défini par le **Référentiel Technique S2M v2.0 §4.19** : ≤300 lignes, extraits opérationnels uniquement.
> **Détails métier complets** dans `PROJECT_CONTEXT_LIC.md`.
> **Règles transverses universelles** dans `docs/REFERENTIEL_S2M.pdf`.

---

## 1. Identité projet

`s2m-lic` — **Licence Manager** (LIC), portail back-office S2M de gestion des licences SELECT-PX vendues aux banques africaines. Mono-tenant. Projet pilote du Référentiel S2M v2.0.

**Stack** : Node 24 + TypeScript 6 strict, Next.js 16 full-stack, PostgreSQL 18, Drizzle 0.45, Zod 4, Auth.js v5 sessions, pg-boss (pas de Redis), Tailwind 4 + shadcn/ui, Vitest, Playwright.

---

## 2. Sources à lire (par ordre)

1. **Référentiel S2M v2.0** (`docs/REFERENTIEL_S2M.pdf`) — règles universelles 25 pages
2. **Ce document** (CLAUDE.md racine) — règles condensées projet
3. **`PROJECT_CONTEXT_LIC.md`** — métier + périmètre + état d'avancement
4. **`app/CLAUDE.md`** — règles workspace
5. **`app/src/server/modules/<X>/CLAUDE.md`** si présent — règles locales du module
6. **ADR concernés** dans `docs/adr/`

---

## 3. Règles ABSOLUES MUST / MUST NOT

> Ces règles ne se contournent **jamais sans validation explicite humain**. Toute violation casse le build (lint/CI) ou le code review.

### MUST (rappel Référentiel §4.2 + spécifique LIC)
- **MUST** utiliser `logger` Pino partout — pas de `console.log` en code applicatif
- **MUST** utiliser des erreurs typées (`app/src/server/modules/error/`) avec codes `SPX-LIC-NNN`
- **MUST** valider toute entrée utilisateur par Zod avant d'atteindre un use-case (schémas dans `shared/src/schemas/`)
- **MUST** appeler `auditLog.record()` dans la **même transaction** que toute mutation métier
- **MUST** respecter l'hexagonal strict : `domain → application → ports → adapters` (vérifié par `eslint-plugin-boundaries`)
- **MUST** passer toute mutation par un **use-case** dans `application/`. Server Actions = validation Zod + appel use-case + `revalidatePath`. Aucune logique métier dans Server Action.
- **MUST** stocker les dates en UTC `TIMESTAMPTZ` côté BD. Conversion fuseau locale frontend uniquement.
- **MUST** afficher les utilisateurs au format **"Prénom NOM (MAT-XXX)"**, jamais matricule seul
- **MUST** vérifier les permissions côté serveur (`requireRole()`) ET côté UI
- **MUST** maintenir la couverture tests ≥80% sur `domain/` et `application/`

### MUST NOT (rappel Référentiel §4.2 + spécifique LIC)
- **MUST NOT** utiliser `any` — préférer `unknown` + narrowing
- **MUST NOT** utiliser `new Error("...")` ni `throw "string"`
- **MUST NOT** utiliser SQL en string brut — toujours Drizzle query builder ou SQL tagged template
- **MUST NOT** implémenter de cryptographie custom — utiliser `node-forge` (PKI) + `crypto` natif Node (AES)
- **MUST NOT** utiliser `useEffect` pour fetch — Server Components ou TanStack Query
- **MUST NOT** faire de mutations directes en composant client — Server Actions uniquement
- **MUST NOT** utiliser CSS inline ni CSS modules — Tailwind `@theme` + utility classes only
- **MUST NOT** mettre de secret en dur — `process.env.X` validé par `app/src/server/infrastructure/env/`
- **MUST NOT** créer dans `app/src/server/modules/<X>/` les dossiers `services/`, `helpers/`, `utils/`, `lib/`, `common/`, `managers/` (Référentiel §4.11)
- **MUST NOT** utiliser `localStorage`/`sessionStorage` pour des données métier
- **MUST NOT** réécrire un fichier entier avec `create_file` quand `str_replace` suffit (Référentiel §4.7)
- **MUST NOT** inventer un visuel — toute couleur/taille/radius/composant vient du DS SELECT-PX (`docs/design/`)

### N/A pour LIC v2 (mono-tenant, pas de monnaie)
- ~~Multi-tenant `tenant_id` + RLS~~ — N/A, voir règle L1
- ~~`decimal.js` pour montants~~ — N/A, voir règle L2 (volumes = entiers)
- ~~Redis / NATS / Outbox~~ — N/A
- ~~JWT access mémoire + refresh cookie~~ — N/A, sessions Auth.js v5

---

## 4. Conventions spécifiques LIC v2

### Codes erreur
Format `SPX-LIC-NNN`. Numérotation par domaine, ranges :
- `SPX-LIC-001 à 099` : auth + sessions
- `SPX-LIC-100 à 199` : clients + entités
- `SPX-LIC-200 à 299` : licences + produits + articles
- `SPX-LIC-300 à 399` : volumes + alertes + healthcheck
- `SPX-LIC-400 à 499` : crypto + PKI + sandbox
- `SPX-LIC-500 à 599` : audit + journal + notifications
- `SPX-LIC-600 à 699` : renouvellements + rapports
- `SPX-LIC-700 à 799` : settings + utilisateurs + référentiels
- `SPX-LIC-900 à 999` : système + jobs + batchs

### Modules (bounded contexts)
Un dossier par domaine sous `app/src/server/modules/<X>/` avec structure stricte `domain/`, `application/`, `ports/`, `adapters/postgres/`, `<X>.module.ts`.

Modules prévus : `client`, `licence`, `article`, `volume`, `alert`, `notification`, `renewal`, `audit`, `catalog`, `team-member`, `user`, `batch`, `report`, `settings`, `crypto`, `sandbox`, `demo`, `email`, `error`.

### Règles spécifiques LIC (L1-L16)
Voir `PROJECT_CONTEXT_LIC.md` section 6. Les plus critiques :
- **L1** Mono-tenant — pas de `tenant_id` ni RLS
- **L2** Volumes = entiers `number` validés `.int().positive()`
- **L3** Audit obligatoire dans la même transaction
- **L4** Optimistic locking sur `lic_licences` via colonne `version`
- **L9** Affichage utilisateur "Prénom NOM (MAT-XXX)"
- **L11** Permissions vérifiées côté serveur ET UI
- **L15** Healthcheck dry-run obligatoire (Upload → Preview → Confirm/Cancel)
- **L16** Sandbox SADMIN sans persistance

### Conventions BD
- Tables : `lic_*` snake_case pluriel
- Exports Drizzle : camelCase **sans** préfixe `lic_` (`clients`, `licences`)
- IDs : **`uuidv7`** PG 18 partout (ADR 0005)
- FK : `<entity>_id`, index : `idx_<table>_<colonnes>`
- Soft delete sur `lic_clients`, `lic_licences`, `lic_users`
- Audit alimenté en TypeScript dans services, **jamais par triggers**

---

## 5. Workflow standard d'une tâche

Référentiel §4.9 adapté LIC v2 :

```
1. Lire CLAUDE.md racine + workspace + PROJECT_CONTEXT_LIC.md
2. Identifier le module concerné (app/src/server/modules/<X>/)
3. Scanner code voisin pour patterns
4. Étendre shared/src/schemas/ si contrat API impacté
5. Implémenter en respectant l'hexagonal :
   - Pure functions / entités → domain/
   - Use-case orchestration → application/
   - Interface repository → ports/ (abstract class)
   - Drizzle implementation → adapters/postgres/
   - Mappers DTO ↔ Domain → adapters/postgres/<X>.mapper.ts
6. Server Action dans app/src/app/(dashboard)/<X>/_actions.ts si UI :
   - Vérifier rôle (requireRole)
   - Valider Zod (parse strict)
   - Appeler use-case
   - revalidatePath / revalidateTag
   - Retour DTO via toDTO()
7. Tests Vitest :
   - domain/ : tests unitaires pures (sans DB)
   - application/ : tests d'intégration (avec DB éphémère)
   - Couverture ≥80%
8. Si schéma BD : pnpm db:generate, vérifier migration
9. make lint (typecheck + boundaries + gitleaks)
10. Mettre à jour PROJECT_CONTEXT_LIC.md si décision structurelle
11. Si nouvelle décision : ajouter ADR dans docs/adr/
```

---

## 6. Templates obligatoires (Référentiel §4.12 adaptés Next.js)

Pour les patterns code Use-case, Port, Adapter, Mapping, Tests : utiliser les templates **Référentiel §4.12.1 à §4.12.5** tels quels (importer `Injectable` n'est pas nécessaire en Next.js — DI manuelle dans `<X>.module.ts`).

Pour le **controller HTTP** (§4.12.4), équivalent Next.js dans `app/src/app/(dashboard)/<X>/_actions.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CreateClientSchema, type ClientDTO } from "@/shared/schemas/client.schema";
import { requireRole } from "@/server/infrastructure/auth";
import { createClientUseCase } from "@/server/modules/client/client.module";
import { toDTO } from "@/server/modules/client/adapters/postgres/client.mapper";

export async function createClientAction(input: z.infer<typeof CreateClientSchema>): Promise<ClientDTO> {
  await requireRole(["ADMIN", "SADMIN"]);
  const dto = CreateClientSchema.parse(input);
  const client = await createClientUseCase.execute(dto);
  revalidatePath("/clients");
  return toDTO(client);
}
```

---

## 7. Commandes unifiées (Référentiel §4.10)

| Commande | Effet |
|---|---|
| `make dev` | Démarre app + worker + Postgres Docker |
| `make test` | Tests unitaires + intégration + E2E |
| `make build` | Build prod tous workspaces |
| `make lint` | Lint + typecheck + boundaries + gitleaks |
| `make migrate` | Applique migrations Drizzle Kit |
| `make clean` | Nettoie builds + arrête conteneurs |

---

## 8. Mise à jour des contextes

Référentiel §4.8 :
- Toute évolution structurelle (nouveau module, nouvelle convention, nouveau pattern) → mettre à jour le **CLAUDE.md du workspace concerné**
- À chaque session significative → mettre à jour `PROJECT_CONTEXT_LIC.md` (champ "Phase actuelle" + nouveaux ADR)
- Quand Claude Code se trompe → consigner immédiatement la correction dans le CLAUDE.md concerné
- Changement généralisable à d'autres projets SPX → remonter à l'équipe Référentiel S2M

---

## 9. Discipline IA (Référentiel §4.7)

- `str_replace` pour modifications ciblées, **pas** de réécriture totale
- `view_range` pour lecture partielle des longs fichiers
- Pas de ré-énoncé du contenu fourni — référencer par chemin et ligne
- Réponses concises, pas de préambule ni conclusion verbeuse
- Pas de synonymes inventés (ex: `client` ≠ `account` ≠ `customer`) — utiliser strictement la nomenclature du Référentiel et du code existant
- Pas de nouveau composant, module ou concept sans validation explicite
- En cas de doute : `[à valider]` entre crochets, jamais d'approximation
- Si un pattern non listé est nécessaire → demander avant de l'introduire

---

## 10. Liens utiles

- **PROJECT_CONTEXT_LIC.md** : `/PROJECT_CONTEXT_LIC.md` (état projet, périmètre, périmètre)
- **Référentiel S2M v2.0** : `docs/REFERENTIEL_S2M.pdf` (règles transverses)
- **Design system** : `docs/design/index.html` + `gallery.html` (tokens + 8 templates)
- **Spec format F2** : `docs/integration/F2_FORMATS.md`
- **ADR fondateurs** : `docs/adr/0001-*.md` à `0006-*.md`
- **Référence v1** (lecture seule) : `E:\DevIA\spx-lic\lic-portal`
