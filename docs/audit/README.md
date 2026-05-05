# Audits LIC v2

Archive des rapports d'audit conformité au Référentiel S2M v2.1, par phase.

## Méthode

À la fin de chaque phase majeure, deux audits sont produits :

- **Audit interne** : produit par l'agent Claude Code en charge du projet, format tabulaire par section Référentiel × statut (✅ / 🟡 / ❌ / ⚪ N/A) + évidence ligne-précise.
- **Audit externe** : produit par un agent indépendant (autre instance Claude.ai ou autre IA) sur la base d'un prompt validateur stable, livrant un verdict Go / Go avec corrections / Stop.

Les deux rapports sont archivés ici.

## Liste des audits

| Phase               | Date     | Audit interne         | Audit externe         | Verdict                                           |
| ------------------- | -------- | --------------------- | --------------------- | ------------------------------------------------- |
| Phase 1 — Bootstrap | Mai 2026 | (à archiver si dispo) | (à archiver si dispo) | Go avec corrections mineures (intégrées Mai 2026) |

## Convention de nommage

- `audit-phase-N-interne.md` — rapport interne
- `audit-phase-N-externe.md` — rapport externe
- `audit-phase-N-corrections.md` — log des corrections appliquées suite aux audits
