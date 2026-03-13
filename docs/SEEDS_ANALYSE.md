# Analyse des seeds – redondances et utilité

## Vue d’ensemble

Le projet propose plusieurs façons d’alimenter la base de données en données de test. Voici une synthèse des redondances et de l’utilité de chaque approche.

---

## 1. Approches coexistantes

| Approche | Emplacement | Contenu principal |
|----------|-------------|-------------------|
| **Node.js (recommandée)** | `backend/scripts/` | Géographie, rôles, types, utilisateurs, lieux, événements, œuvres |
| **SQL** | `backend/database/seeds/` | Données de référence (via Makefile / `make setup`) |

---

## 2. Redondances identifiées

### Entre `seed-all-data.js` et `seed-database.js`

- **Classifications** : Types d’événements, types d’utilisateurs, types de lieux — partiellement dupliqués.
- **Œuvres** : `seed-all-data.js` utilise `seed-data-reference.js` (données génériques). `seed-database.js` ajoute des œuvres algériennes réelles (Nedjma, Bataille d’Alger, etc.). Pas de doublon au niveau des œuvres si on exécute les deux.

### Entre `seed-reference-data.sql` et `seed-all-data.js`

- **Données de référence** : Types de contenu, classifications, etc. — similaires.
- **Usage** : Le SQL est utilisé par `make setup` ou `run-seeds-mysql.sh`. Les scripts Node sont indépendants.

### Scripts dans `backend/scripts/archives/`

- `seedDatabaseEvent.js`, `seedOeuvres.js`, `seedTypeUsers.js`, `seedProCom.js` — **remplacés** par `seed-all-data.js`. À garder uniquement pour l’historique si nécessaire.

---

## 3. Utilité des seeds

| Script / Fichier | Utile ? | Quand l’utiliser |
|------------------|---------|-------------------|
| `seed-geography.js` | ✅ Oui | Obligatoire en premier (wilayas, dairas, communes) |
| `seed-all-data.js` | ✅ Oui | Données complètes pour dev/test |
| `seed-database.js` | ✅ Oui (optionnel) | Ajouter des œuvres algériennes détaillées |
| `seed-reference-data.sql` | ⚠️ Dépend | Si vous utilisez `make setup` plutôt que les scripts Node |
| Scripts dans `archives/` | ❌ Non | Obsolètes, remplacés par `seed-all-data.js` |

---

## 4. Recommandation de workflow

```bash
cd backend

# 1. Géographie (OBLIGATOIRE)
node scripts/seed-geography.js

# 2. Données complètes (RECOMMANDÉ)
node scripts/seed-all-data.js

# 3. Optionnel : œuvres algériennes
node scripts/seed-database.js
```

---

## 5. Actions possibles

1. **Conserver** les deux approches (Node + SQL) si le Makefile est utilisé ailleurs (CI, Docker, etc.).
2. **Supprimer** les scripts dans `archives/` s’ils ne sont plus nécessaires.
3. **Documenter** dans le README que `seed-reference-data.sql` sert au `make setup` et que les scripts Node sont la méthode principale pour le développement local.
