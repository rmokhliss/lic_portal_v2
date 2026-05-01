# 0004 — Recherche audit via Postgres Full-Text Search

## Status
Accepted — Avril 2026

## Context

L'écran EC-06 "Journal des modifications" doit permettre aux utilisateurs S2M de retrouver une action spécifique dans `lic_audit_log` à partir de mots-clés (nom de client, référence licence, code action, valeur métier...). Le journal d'audit grandit linéairement avec l'activité (~10 K à 100 K entrées par mois selon volumétrie).

Trois options évaluées :

1. **Recherche `LIKE` / `ILIKE` sur les colonnes** — simple mais lent dès quelques centaines de milliers de lignes, et ne gère ni le stemming (singulier/pluriel) ni les accents (clé UX en français).
2. **Service externe** (Elasticsearch, Meilisearch, Typesense) — performances excellentes et fonctionnalités riches, mais introduit une dépendance opérationnelle supplémentaire (un service à monitorer, déployer, sauvegarder, sécuriser) pour un besoin actuellement modeste.
3. **Postgres Full-Text Search natif** avec colonne `tsvector` générée + index GIN — gère stemming français, accents, stop-words ; performance excellente jusqu'à plusieurs millions de lignes ; pas de service externe.

L'audit log de LIC contient des chaînes courtes et structurées (entité, action, JSONB before/after avec valeurs métier). Le matching par mots-clés est suffisant : pas besoin de recherche sémantique ni de pertinence sophistiquée.

## Decision

**Option 3** : recherche FTS native PostgreSQL avec dictionnaire **français**, via une colonne `tsvector` générée automatiquement et indexée GIN.

**Schéma cible** sur `lic_audit_log` :

```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('french',
    coalesce(entity, '') || ' ' ||
    coalesce(action, '') || ' ' ||
    coalesce(before_data::text, '') || ' ' ||
    coalesce(after_data::text, '') || ' ' ||
    coalesce(user_display, '') || ' ' ||
    coalesce(client_display, '')
  )
) STORED;

CREATE INDEX idx_audit_search ON lic_audit_log USING GIN (search_vector);
```

**Note importante** : v2 inclut **dès l'origine** les champs `user_display` et `client_display` dénormalisés dans `lic_audit_log` (DETTE-001 v1 traitée d'entrée). Le `auditLog.record()` rempli ces colonnes au moment de l'insertion, ce qui permet à la recherche FTS de matcher sur le nom d'utilisateur (ex: "Kacem") ou le nom de client (ex: "NDB Zambia") sans jointure.

**Côté service** :
```ts
where(sql`${auditLogs.searchVector} @@ plainto_tsquery('french', ${query})`)
```

## Consequences

**Bonnes**
- Une seule source de vérité (Postgres) — pas de service externe à opérer
- Stemming français natif : "modifié" matche "modifications", "client" matche "clients"
- Performances excellentes (~10 ms sur des millions de lignes avec index GIN)
- Coût opérationnel zéro (aucun service supplémentaire)
- DETTE-001 du v1 (FTS limité aux champs internes) **résolue dès la v2**

**Mauvaises**
- ~20% d'overhead de stockage sur `lic_audit_log` (colonne `tsvector` STORED)
- Index GIN coûteux en écriture (impact négligeable car audit_log est append-only à faible vélocité)
- Si les besoins évoluent vers de la recherche multi-domaine (clients + licences + articles + audit dans une seule barre de recherche), il faudra migrer vers Meilisearch ou équivalent — non bloquant mais à anticiper

**Neutres**
- L'UI EC-06 expose un champ de recherche unique en plus des filtres (période, client, utilisateur, type d'entité, action, mode)
- Le composant `<JsonDiff>` côté UI affiche les changements en langage naturel à partir des données `before_data` / `after_data` JSONB (acquis sprint 9 N-002)
