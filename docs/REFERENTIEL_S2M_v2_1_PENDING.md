# Référentiel S2M v2.1 — PDF en attente d'intégration

> **Statut** : v2.1 mentionnée dans CLAUDE.md / PROJECT_CONTEXT_LIC.md / README.md (post audit Master Mai 2026), **mais le PDF v2.1 n'a pas encore été poussé dans le repo**. Le fichier `docs/REFERENTIEL_S2M.pdf` actuellement présent reste **v2.0** jusqu'à remplacement.
>
> Tracé comme **DETTE-LIC-020** dans `PROJECT_CONTEXT_LIC.md` §10.

## Pourquoi cette dette existe

L'audit Master Référentiel reçu Mai 2026 (note interne S2M direction technique) a livré un rapport textuel `AUDIT_ALIGNEMENT_LIC_v2_1.md` qui :

- Note 3 corrections critiques + 4 importantes + 3 mineures à intégrer dans LIC v2 (Phase 15).
- Capitalise les feedbacks LIC v2 dans la **future v2.1** du Référentiel (FB-24 application→infrastructure, FB-25 proxy.ts Next.js 16).
- Mentionne explicitement « le PDF v2.1 sera publié séparément à T+2 semaines ».

LIC v2 doit donc **mentionner v2.1 dès Phase 15** (cohérence avec les nouvelles règles appliquées : redaction PII §4.19, split health probes, etc.) **mais pointer vers un PDF qui reste v2.0** jusqu'à livraison du PDF v2.1.

## Différences v2.0 → v2.1 (recensées via audit Master)

| Section v2.1                                     | Nature                                             | Action LIC v2 (Phase 15)                                                   |
| ------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------- |
| §4.19 Redaction PII obligatoire dans les loggers | Nouvelle règle critique                            | A1 : `pino.redact` avec paths password / token / authorization / pan / cvv |
| §4.13 Variantes architecturales A/B (précision)  | Encart à ajouter sur `db.transaction()` Variante B | A2 : ADR-0010 (en attendant l'encart Référentiel)                          |
| §4.16 Headers HTTP de sécurité Next.js 16        | Renommage `middleware.ts` → `proxy.ts`             | Déjà appliqué Phase 13.A (commit `2b8fc3c`)                                |
| §4.7 Stop validate config files                  | Liste enrichie (`docker-compose.yml` ajouté)       | B4 : CLAUDE.md §9 mis à jour                                               |
| §4.19 Probes Kubernetes liveness vs readiness    | Nouvelle règle                                     | B1 : split `/api/health` en `/live` + `/ready`                             |

## Action attendue

Quand le PDF v2.1 est disponible :

1. Remplacer `docs/REFERENTIEL_S2M.pdf` par la version v2.1.
2. Supprimer ce fichier `REFERENTIEL_S2M_v2_1_PENDING.md`.
3. Marquer **DETTE-LIC-020** résolue dans `PROJECT_CONTEXT_LIC.md` §10.
4. Vérifier qu'aucune règle Phase 15 ne diverge des nouvelles sections du PDF v2.1 (ex : §4.19 redaction PII paths suggérés, format audit logs).

## Références

- Audit Master Mai 2026 : `docs/audit/AUDIT_MVP_GLOBAL_MAI_2026.md` (Phase 15)
- ADR-0010 : couplage `application/` → `infrastructure/db` Variante B (FB-24)
- Phase 15 résolutions : `docs/audit/audit-phase-15-alignement.md`
