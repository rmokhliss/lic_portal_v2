# 0018 — CSP nonces production-only (Variante A+nonces) — résolution DETTE-LIC-004

## Status

Accepted — Mai 2026 (Phase 13.A — Durcissement sécurité prod).

Résout `DETTE-LIC-004` (CSP `'unsafe-inline'` + `'unsafe-eval'` ouverte F-15).

## Context

### Etat F-15 (Variante A — CSP permissive uniforme)

`F-15` (Phase 2.A.bis) a livré 6 headers HTTP de sécurité dans `app/next.config.ts`, dont une CSP appliquée uniformément en dev et prod :

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
style-src  'self' 'unsafe-inline'
```

Justifications documentées (cf. `next.config.ts` headers) :

- `'unsafe-inline'` script : Next.js 16 + RSC injectent du `<script>` inline pour le bootstrap client (`__next_f.push`, …).
- `'unsafe-eval'` script : Turbopack HMR (dev) utilise `eval()` pour le hot-reload.
- `'unsafe-inline'` style : Tailwind 4 + shadcn/ui + Radix injectent des `<style>` inline (variants, animations).

Le Référentiel S2M v2.1 §4.16 prescrit pour CSP « Démarrer en mode Report-Only puis enforcer » et acte la CSP nonce-based comme cible. F-15 est resté à la Variante A permissive, dette tracée `DETTE-LIC-004`.

### Pourquoi durcir maintenant

Phase 13 — durcissement sécurité prod en vue de premier déploiement client. La CSP permissive est le point faible le plus visible d'un pentest bancaire (cible Référentiel §4.16). Garder `'unsafe-eval'` en prod n'est techniquement pas requis (Turbopack n'est utilisé qu'en dev — le build prod minifié n'eval rien). Garder `'unsafe-inline'` script en prod est résolu par les nonces.

## Decision

LIC v2 implémente la **Variante A+nonces production-only** :

- **DEV** (`NODE_ENV !== 'production'`) : CSP permissive (Variante A) inchangée — `next.config.ts` headers s'applique tel quel. Compatibilité Turbopack HMR + React Refresh. Les nonces sont **désactivés** pour ne pas ralentir le DX et éviter les faux-positifs de violation CSP en dev.
- **PROD** (`NODE_ENV === 'production'`) : un proxy Next.js 16 (`app/src/proxy.ts`) génère un nonce cryptographique par requête et applique une CSP stricte qui surcharge celle de `next.config.ts` :
  ```
  script-src 'self' 'nonce-XXX' 'strict-dynamic'
  ```
  La directive `'strict-dynamic'` autorise les scripts chargés dynamiquement par un script lui-même nonce-able (pattern Next.js bootstrap RSC). `'unsafe-inline'` script + `'unsafe-eval'` sont **éliminés** en prod.

`'unsafe-inline'` style reste conservé en prod : éliminer les styles inline impose une refonte Tailwind + shadcn + Radix disproportionnée pour un back-office mono-tenant. Le risque résiduel XSS via style-injection est faible (pas d'expression CSS arbitraire exécutable).

### Pourquoi un proxy plutôt que la CSP statique de next.config.ts

Une CSP nonce-based **doit** générer un nonce par requête. Le `headers()` de `next.config.ts` est statique (build-time) et ne peut pas générer de nonce dynamique. Seul un middleware/proxy Edge runtime peut le faire. Next.js 16 expose ce hook via `app/src/proxy.ts` (nouveau nom, ex `middleware.ts` deprecated — cf. DETTE-LIC-002 résolue). Source : `node_modules/next/dist/build/templates/middleware.js.map` — `const isProxy = page === '/proxy' || page === '/src/proxy'` puis `(isProxy ? mod.proxy : mod.middleware) || mod.default`.

### Pourquoi production-only et pas en dev aussi

Référentiel §4.7 décourage les comportements `NODE_ENV`-dépendants dans les configs architecturales pour éviter les divergences cachées. Cas exceptionnel justifié ici :

- Turbopack HMR utilise `eval()` en dev — non négociable, fait partie de l'outillage Next.js 16.
- Forcer la CSP nonce en dev imposerait `'unsafe-eval'` quand même → la CSP nonce ne durcirait rien tout en complexifiant le DX (re-render à chaque hit du fait du nonce changeant qui invalide le cache HTML). Le gain en dev = nul, le coût = réel.
- Le pentest cible la prod, pas le dev. La CSP nonce-based en prod uniquement répond exactement à la menace.

Le `NODE_ENV !== 'production'` guard dans `proxy.ts` est documenté inline et fait l'objet d'un commentaire explicite (≠ comportement implicite).

### Diff effectif sur le HTML rendu

| Surface             | DEV (avant et après)                                                                                | PROD avant F-15                        | PROD après ADR 0018                                    |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `script-src`        | `'self' 'unsafe-inline' 'unsafe-eval'`                                                              | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self' 'nonce-XXX' 'strict-dynamic'`                  |
| `style-src`         | `'self' 'unsafe-inline'`                                                                            | `'self' 'unsafe-inline'`               | `'self' 'unsafe-inline'` (inchangé — compromis assumé) |
| Header `x-nonce`    | absent                                                                                              | absent                                 | présent (nonce courant — lisible par layouts SSR)      |
| Autres headers F-15 | inchangés (HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) |                                        |                                                        |

## Consequences

**Bonnes**

- `DETTE-LIC-004` résolue : `'unsafe-inline'` script + `'unsafe-eval'` éliminés en prod. La CSP prod passe maintenant les checks pentest standards (OWASP CSP Level 3).
- Pas de régression DX dev : Turbopack HMR + React Refresh fonctionnent comme avant.
- Convention Next.js 16 (`proxy.ts`) appliquée — la dépréciation `middleware.ts → proxy.ts` est intégrée plutôt que contournée (`DETTE-LIC-002` était résolue par suppression, ici on revient mais avec le nouveau nom).
- Le pattern proxy + nonce devient réutilisable pour Phase 13.x ultérieure : rate limiting Edge sur endpoints publics si besoin, propagation `traceparent` OTel, etc. (extension du proxy, pas refonte).

**Mauvaises**

- Comportement `NODE_ENV`-dépendant introduit (dérogation explicite §4.7). Documenté inline et limité au seul fichier `proxy.ts`. Le risque "ça marche en dev mais casse en prod" est mitigé par le test E2E Playwright en mode prod (à ajouter Phase 13.x si pas déjà couvert).
- `'unsafe-inline'` style reste en prod — risque résiduel XSS via style injection (faible, accepté). Si un pentest le flag, ouvrir une nouvelle dette pour passer à `nonce-` aussi sur style-src (impose refonte DS).
- Léger surcoût Edge par requête : `crypto.randomUUID()` + `btoa()` + `Headers.set` + `NextResponse.next` ≈ <1ms. Acceptable pour un back-office mono-tenant <1000 req/min.
- Le matcher du proxy exclut `/api/*` — si Phase 13.x ajoute des endpoints publics, ils n'auront pas la CSP nonce (pas de besoin pour des endpoints JSON, mais à valider si futur endpoint sert du HTML).

**Neutres**

- Aucun impact sur les Server Actions ni les Server Components — le nonce est exposé via `x-nonce` mais LIC v2 n'a pas de `<script>` inline custom. Si un futur écran a besoin (ex: widget tiers), le pattern de lecture est `import { headers } from "next/headers"` puis `<script nonce={(await headers()).get("x-nonce")} />`.
- ADR 0009 (Variante B Next.js full-stack) — note transverse Mai 2026 : la ligne « Rate limiting / À implémenter en middleware Next.js si endpoints publics exposés (non requis phase actuelle) » de la table §4.12 reste exacte, mais le projet a désormais un `proxy.ts` actif (pour CSP nonces, pas pour rate limiting). Le rate limiting reste applicatif (Server Actions, cf. `app/src/server/infrastructure/rate-limit/`).

## Références

- `app/src/proxy.ts` — implémentation
- `app/next.config.ts` — CSP dev permissive (inchangée), commentaire mis à jour
- `PROJECT_CONTEXT_LIC.md` §10 — DETTE-LIC-004 marquée résolue
- Référentiel S2M v2.1 §4.16 — exigences headers HTTP de sécurité
- Next.js 16 doc proxy (template `node_modules/next/dist/build/templates/middleware.ts`) — convention `proxy.ts` vs `middleware.ts`
