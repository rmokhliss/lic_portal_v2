# 0006 — Catalogue commercial Produits → Articles avec/sans volume

## Status
Accepted — Avril 2026

## Context

Le modèle commercial historique de LIC v0 était plat :
- Une licence référençait directement des **modules** (table `lic_modules_ref`) avec des **unités d'œuvre** (table `lic_unites_ref`) et des **interfaces** (table `lic_interfaces_ref`)

Ce modèle ne reflétait pas la réalité de vente SELECT-PX :
- S2M vend en réalité des **suites commerciales** (SPX Acquiring Suite, SPX Issuing Suite, Wallet, Digital Hub, SoftPOS, Instant Client, etc.)
- Chaque suite contient **plusieurs articles facturables** (ex: SPX Acquiring inclut "ATM Management standard", "POS Server", "Merchant Portal", etc.)
- Certains articles ont un **volume contractuel** (ex: nb GAB, nb porteurs) — d'autres pas (simple présence/activation, ex: "Module reporting activé")
- Les codes articles peuvent **différer entre versions** SPX et SSV6 (volumes différents possibles chez un même client) → besoin de codes distincts `ATM_STD_SPX` / `ATM_STD_V6`

Le sprint 10 (lots A1-A4) du projet v1 a refondu cette modélisation. Le sprint 13 (DEC-022) a définitivement supprimé l'ancien modèle. LIC v2 part directement sur le modèle final, sans transition.

## Decision

Modèle à **2 niveaux** : Produit → Article, avec drapeau `a_volume` au niveau article.

```
PRODUIT (lic_produits_ref)
  ├── code (ex: SPX_ACQUIRING, SPX_ISSUING, WALLET, DIGITAL_HUB)
  ├── libellé (ex: "SelectPX Acquiring Suite")
  └── ARTICLE (lic_articles_ref)
        ├── code (ex: ATM_STD_SPX, POS_SERVER_SPX)
        ├── libellé (ex: "ATM Management standard")
        ├── a_volume = true|false
        └── unite_label si a_volume = true (ex: "Nombre de GAB")
```

**Tables de liaison licence ↔ catalogue** :
- `lic_licence_produits` : produits **inclus** dans une licence (drapeau `actif` désactivable sans suppression)
- `lic_licence_articles` : articles **inclus** dans une licence avec leurs `vol_contractuel`, `vol_consomme`, `seuil_alerte_pct`
- `lic_article_volume_history` : snapshots mensuels par article (alimenté par job `snapshot-volumes`, alimenté par calcul de tendance et projection)

**Statut calculé** d'un article (pure function) :
- `OK` : `pct < seuil_alerte_pct`
- `ALERTE` : `seuil_alerte_pct ≤ pct < 100`
- `DEPASSE` : `pct ≥ 100`
- `N/A` : `vol_contractuel IS NULL` (article sans volume) ou ≤ 0

**Articles dupliqués SPX/SSV6** : codes distincts assumés. Ce n'est pas une duplication accidentelle, c'est la modélisation correcte (les volumes peuvent vraiment différer entre versions chez un même client).

**Volumes** : `numeric(12,0)` côté BD (entiers purs), `number` côté TypeScript validés `.int().positive()` avec Zod (cf. règle L2 du PROJECT_CONTEXT). **Pas de `decimal.js`** — LIC ne manipule pas de monnaie.

## Consequences

**Bonnes**
- Le wizard de création licence (EC-03c) reflète directement le bon de commande commercial (étape "Produits & articles")
- Reporting commercial direct par produit (volumétrie par suite commerciale)
- Distinction `a_volume = true/false` claire dès le catalogue, pas d'ambiguïté à l'usage
- Filtres par produit dans EC-02 (liste licences) et EC-04 (volumes) sont naturels
- Les alertes EC-07 ciblent par client + produit + article (granularité fine)

**Mauvaises**
- +2 tables référentielles par rapport au modèle plat (`lic_produits_ref`, `lic_articles_ref`)
- +3 tables de liaison (`lic_licence_produits`, `lic_licence_articles`, `lic_article_volume_history`)
- Les codes articles dupliqués SPX/SSV6 peuvent surprendre au premier regard (mais c'est volontaire et documenté)

**Neutres**
- Catalogue éditable par SADMIN dans `/settings/catalogues` (CRUD complet sur `lic_produits_ref` et `lic_articles_ref`)
- Le modèle data-model.md du repo v1 (sprint 13) sert de référence détaillée pour la modélisation Drizzle
- Le seed de démo v2 alimente ~19 produits et ~89 articles (30 avec volume + 59 sans), reflet du catalogue commercial réel SELECT-PX
