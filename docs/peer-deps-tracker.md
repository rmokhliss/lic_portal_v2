# Peer dependencies tracker LIC v2

Suivi des avertissements `peer dependencies` lors d'installation pnpm. Les bumps majors récents (Next.js 16, React 19, Tailwind 4) provoquent des désynchronisations attendues qui se résorbent quand l'écosystème met à jour ses peer ranges.

**Règle** : ce fichier est mis à jour quand un avertissement peer apparaît à `pnpm install`. Une entrée est retirée quand le warning disparaît (paquet à jour).

## Cas en cours (Phase 1 — Mai 2026)

| Paquet       | Version installée | Peer attendue                               | Phase de résolution                                                              |
| ------------ | ----------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `next-auth`  | `5.0.0-beta.25`   | `next@^14 \|\| ^15` (on a `next@^16.2.4`)   | Phase 6 (Auth.js) — bump vers release Next-16-compatible                         |
| `@auth/core` | `0.41.2`          | `nodemailer@^7.0.7` (on a `nodemailer@6.x`) | Phase 6 (Auth.js) — bump nodemailer 6 → 7 ou attendre `@auth/core` v6-compatible |

## Cas résolus (archive)

_(Aucun pour l'instant.)_

## Process

- À chaque `pnpm install`, scanner les warnings `peer dep`.
- Pour chaque NOUVEAU warning : ajouter une ligne au tableau "Cas en cours".
- Pour chaque warning DISPARU : déplacer la ligne dans "Cas résolus" avec date.
- Si un warning bloque le projet : ouvrir un ADR pour acter la décision (downgrade, fork, attente).
