# 0003 — Hiérarchie Client → Entité → Licence

## Status
Accepted — Avril 2026

## Context

La modélisation initiale de LIC v0 était `Client → Licence` directement (un client a une ou plusieurs licences). Cette modélisation s'est révélée insuffisante face à la réalité commerciale S2M en Afrique.

Cas d'usage réels :
- **Attijariwafa Group** est un groupe bancaire avec plusieurs filiales : Attijariwafa Maroc, Attijariwafa Sénégal, Attijariwafa Côte d'Ivoire, etc. Chaque filiale signe ses **propres contrats** SELECT-PX selon ses besoins locaux.
- **Bank Al-Maghrib** est une banque centrale standalone (une seule entité).
- Une même filiale peut avoir **plusieurs licences simultanées** : une pour SPX Acquiring, une pour SPX Issuing avec dates et volumes contractuels distincts.
- Le reporting commercial S2M doit pouvoir agréger **par groupe** (vue groupe Attijariwafa) ou **par filiale** (vue Attijariwafa Sénégal).

Sans niveau intermédiaire, on est forcé à des hacks :
- Soit dupliquer le client (`Attijariwafa Sénégal` comme client distinct de `Attijariwafa Maroc`) → perte de la cohérence groupe
- Soit dénormaliser dans `lic_licences` (champ `pays`, `filiale`...) → données fragiles, pas de référentiel propre

## Decision

Modèle à **3 niveaux** :

```
CLIENT (groupe ou institution standalone — ex: Attijariwafa Group, Bank Al-Maghrib)
  └── ENTITE (filiale ou périmètre — ex: Attijariwafa Sénégal, ou "Siège" pour standalone)
        └── LICENCE (contrat avec dates, statut, volumes)
```

**Implémentation** :
- Nouvelle table `lic_entites` (FK vers `lic_clients`)
- `lic_licences.entite_id` FK vers `lic_entites`
- `lic_licences.client_id` **conservé dénormalisé** pour filtrage rapide (évite jointure systématique)
- Pour un client sans filiales (cas standalone), une entité par défaut nommée "Siège" est créée automatiquement à la création du client

**Règle métier complémentaire** (acquise du sprint 5) : si on crée une licence pour une entité qui en a déjà une **active** avec **chevauchement de dates**, le portail affiche un warning avec confirmation explicite avant l'INSERT.

**Filtres dans les écrans** :
- EC-02 Liste licences : combobox Client + combobox Entité dépendante
- EC-04 Volumes : combobox Client + Entité + Licence en cascade
- Reporting : agrégations possibles par client OU par entité

## Consequences

**Bonnes**
- Reflète fidèlement la réalité commerciale S2M en Afrique (multi-filiales fréquent)
- Permet le reporting consolidé groupe **et** détaillé par filiale
- Préserve la cohérence référentielle (un seul `lic_clients` "Attijariwafa Group" même avec 5 filiales)
- Filtres en cascade dans l'UI sont naturels et performants

**Mauvaises**
- +1 table (`lic_entites`)
- +1 jointure dans toutes les queries licence
- Dénormalisation `client_id` sur `lic_licences` à maintenir (mais c'est un gain de perf significatif sur les filtres EC-02)

**Neutres**
- Tous les écrans v2 supposent ce modèle (EC-02, EC-03, EC-04, EC-Clients, etc.)
- Le wizard de création licence (EC-03c) sélectionne **Client puis Entité en cascade** comme première étape
