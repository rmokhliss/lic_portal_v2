# app/CLAUDE.md — workspace Next.js

> Règles spécifiques à `app/`. Lu après le `CLAUDE.md` racine.
> **Détails complets** dans `../PROJECT_CONTEXT_LIC.md` (sections 4, 5, 6).

---

## Périmètre du workspace

Ce workspace contient **toute** l'application LIC v2 :

- **Frontend** : `src/app/` (Next.js App Router), `src/components/`, `src/hooks/`, `src/lib/`, `src/i18n/`
- **Backend** : `src/server/modules/`, `src/server/infrastructure/`, `src/server/jobs/`

Le workspace `shared/` est utilisé pour les **schémas Zod partagés** UI ↔ serveur.

---

## Règles structurantes

### 1. Hexagonal strict dans `src/server/modules/<X>/`

```
modules/
└── <domain>/
    ├── domain/         pure functions + entités (pas de Drizzle, pas de Zod)
    ├── application/    use-cases (orchestration + transactions + audit)
    ├── ports/          interfaces (abstract class)
    ├── adapters/
    │   └── postgres/   implémentation Drizzle des ports + mappers
    └── <domain>.module.ts   composition root (DI manuelle)
```

**Interdit dans `modules/<X>/`** : `services/`, `helpers/`, `utils/`, `lib/`, `common/`, `managers/` (Référentiel §4.11).

Vérifié par `eslint-plugin-boundaries` au pre-commit + CI.

### 2. Server Actions = controllers

- Un fichier `_actions.ts` par page Next.js dans `src/app/(dashboard)/<X>/`
- Pattern obligatoire :
  ```ts
  "use server";
  // 1. requireRole(["ADMIN", "SADMIN"])
  // 2. Schema.parse(input)
  // 3. await useCase.execute(parsedInput)
  // 4. revalidatePath(...)
  // 5. return toDTO(result)
  ```
- **Aucune logique métier** dans une Server Action

### 3. Schémas Zod **toujours** dans `../shared/src/schemas/`

Une mutation = un schéma Zod dans `shared/`. Server Action et use-case lisent le **même schéma**.

### 4. Pas de Drizzle hors des adapters

- `application/` n'importe **jamais** `drizzle-orm` ni `db`
- Seuls `adapters/postgres/` et `infrastructure/db/` connaissent Drizzle

### 5. Tests obligatoires

- **Tests unitaires** Vitest sur `domain/` (pures, sans BD)
- **Tests d'intégration** Vitest sur `application/` (DB éphémère via testkit)
- **Tests E2E** Playwright sur les flows critiques (auth, création licence, génération `.lic`, healthcheck dry-run)
- Couverture **≥80%** sur `domain/` et `application/`

---

## Conventions de fichiers

| Type                      | Pattern                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Use-case                  | `<verb>-<entity>.usecase.ts` (ex: `create-licence.usecase.ts`)                                                  |
| Port (interface)          | `<entity>.repository.ts`, `<entity>.recorder.ts`                                                                |
| Adapter Drizzle           | `<entity>.repository.pg.ts`                                                                                     |
| Mapper                    | `<entity>.mapper.ts`                                                                                            |
| Composition root          | `<domain>.module.ts`                                                                                            |
| Schéma Drizzle            | `modules/<X>/adapters/postgres/schema.ts` (surface publique cross-module — règle ESLint `module-schema`)        |
| Barrel schémas            | `infrastructure/db/schema/index.ts` ré-exporte les tables — consommé par `client.ts` et le wildcard Drizzle Kit |
| Server Action             | `_actions.ts` co-localisé avec `page.tsx`                                                                       |
| Composant page-spécifique | `_components/<kebab-case>.tsx`                                                                                  |
| Tests                     | `__tests__/<file>.spec.ts`                                                                                      |

---

## Server Actions — template strict

```ts
// src/app/(dashboard)/clients/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { CreateClientSchema, type ClientDTO } from "@/shared/schemas/client.schema";
import { requireRole } from "@/server/infrastructure/auth";
import { createClientUseCase } from "@/server/modules/client/client.module";
import { toDTO } from "@/server/modules/client/adapters/postgres/client.mapper";

export async function createClientAction(input: unknown): Promise<ClientDTO> {
  await requireRole(["ADMIN", "SADMIN"]);
  const parsed = CreateClientSchema.parse(input);
  const client = await createClientUseCase.execute(parsed);
  revalidatePath("/clients");
  return toDTO(client);
}
```

---

## Use-case — template strict

```ts
// src/server/modules/client/application/create-client.usecase.ts
import type { ClientRepository } from "../ports/client.repository";
import type { AuditRecorder } from "@/server/modules/audit/ports/audit.recorder";
import { Client } from "../domain/client.entity";
import type { CreateClientInput } from "@/shared/schemas/client.schema";

export class CreateClientUseCase {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly auditRecorder: AuditRecorder,
  ) {}

  async execute(input: CreateClientInput): Promise<Client> {
    const client = Client.create(input);
    await this.clientRepository.save(client);
    await this.auditRecorder.record({
      entity: "client",
      entityId: client.id,
      action: "CREATE",
      after: client.toJSON(),
    });
    return client;
  }
}
```

---

## Schéma seul — cas transitoire

Quand un module métier n'a pas encore ses `domain/`, `application/`, `ports/` (Phase N introduit le schéma, Phase N+1 le reste — cas Phase 2.B référentiels) :

- **Créer** uniquement `modules/<X>/adapters/postgres/schema.ts`.
- **Ne pas créer** de `<X>.module.ts` qui ré-exporterait juste le schéma — le couple `module-root → module-schema` n'est pas autorisé par `eslint-plugin-boundaries` (cf. `eslint.config.mjs:158`). Le `<X>.module.ts` viendra avec sa vraie surface (singletons repository, use-cases) à la phase suivante.
- **Ré-exporter** la table dans `infrastructure/db/schema/index.ts` (couple `infrastructure → module-schema` autorisé en `eslint.config.mjs:178`). Drizzle Kit lit le wildcard, le runtime importe via le barrel.

---

## Migrations Drizzle Kit + seed bootstrap

Pour une étape qui livre des tables ET un seed minimal (référentiels, enums BD, …) :

- **2 migrations distinctes**, jamais mélangées :
  1. `pnpm db:generate` → migration auto-générée pour le DDL (`<NNNN>_<auto-name>.sql`).
  2. `pnpm db:generate --custom --name <verb>_<scope>_bootstrap` → fichier SQL vide, à éditer manuellement pour le seed.
- **Idempotence obligatoire** sur le seed : `INSERT ... ON CONFLICT (<colonne_unique_business>) DO NOTHING`. Cibler la colonne **business** (`region_code`, `code_devise`, …), pas l'`id` serial qui n'est pas figé.
- **Pas de seed dans le DDL** : Drizzle Kit `db:generate` régénère le DDL à chaque modif schéma. Mêler du seed dedans le casserait à la prochaine régénération.
- Les deux fichiers sont versionnés et apparaissent dans `meta/_journal.json` dans l'ordre de création — `pnpm db:migrate` les applique séquentiellement.

---

## Worker pg-boss

Process **séparé** : `pnpm worker:dev` (dev) ou container Docker dédié (prod).

Point d'entrée : `src/server/jobs/worker.ts`.

5 jobs (cf. `PROJECT_CONTEXT_LIC.md` §8.5) : `expire-licences`, `check-alerts`, `auto-renewal`, `snapshot-volumes`, `cleanup-old-batches`.

Chaque exécution trace dans `lic_batch_executions` + `lic_batch_logs` (ce sont ces tables que l'écran EC-12 lit, **pas** les tables internes pg-boss).

---

## Liens

- Règles globales projet : `../CLAUDE.md`
- État projet et périmètre : `../PROJECT_CONTEXT_LIC.md`
- Référentiel transverse : `../docs/REFERENTIEL_S2M.pdf`
- ADR : `../docs/adr/`
- Templates code obligatoires : Référentiel §4.12 (use-case, port, adapter, mapping, controller HTTP, tests)
