---
title: Guide des modifications et étapes d’exécution (Docker)
updated_at: 2026-03-04
---

# 1) Résumé des modifications réalisées

## 1.1 Frontend (formulaire événement)
- Ajout des clés i18n FR manquantes pour le formulaire de création d’événement.
- Correction des `Select` React qui passaient de `uncontrolled` à `controlled`.
- Fichiers principaux impactés :
  - `frontEnd/i18n/locales/fr/translation.json`
  - `frontEnd/src/pages/AjouterEvenement.tsx`

## 1.2 LieuSelector / check duplicate
- Correction côté frontend pour éviter l’erreur non gérée (`Uncaught Promise`) lors d’un échec de vérification des doublons.
- Durcissement côté backend de la vérification de doublons (`checkDuplicate`) :
  - normalisation des entrées,
  - parsing sécurisé des coordonnées,
  - fallback de recherche plus tolérant.
- Fichiers principaux impactés :
  - `frontEnd/src/components/LieuSelector.tsx`
  - `backend/controllers/lieuController.js`

## 1.3 Git / branches
- Push effectué sur `develop`.
- Merge de la branche `samy` dans `develop` réalisé, avec résolution des conflits en prenant la version de Samy sur les fichiers en conflit.

## 1.4 Docker / environnement
- Vérification du chargement des variables `.env` par Docker Compose.
- Correction d’un problème d’authentification MySQL (`SequelizeAccessDeniedError`) dû à un décalage entre les credentials initiaux du volume MySQL et ceux utilisés par le backend.
- Alignement des variables DB dans `/.env` avec l’utilisateur réellement créé dans MySQL (`actionculture_user`).

---

# 2) Étapes d’exécution du projet avec Docker (DEV)

## 2.1 Pré-requis
- Docker Desktop installé et démarré.
- Se placer à la racine du projet :

```powershell
cd c:\Users\sabab\EventCulture
```

## 2.2 Préparer les variables d’environnement
1. Copier le template racine :

```powershell
Copy-Item .env.example .env
```

2. Vérifier/minimum requis dans `/.env` :

```env
DB_HOST=mysql
DB_PORT=3306
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=<mot_de_passe_user_mysql>
PORT=3001
JWT_SECRET=<secret>
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001/api
```

> Important : ne pas committer le fichier `.env`.

## 2.3 Lancer les services

```powershell
docker compose up -d --build
```

## 2.4 Vérifier l’état

```powershell
docker compose ps
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

## 2.5 URLs utiles
- Frontend : `http://localhost:3000`
- API : `http://localhost:3001/api`
- Health backend : `http://localhost:3001/health`

---

# 3) Dépannage (erreurs rencontrées)

## 3.1 Erreur: variables d’environnement manquantes (PORT, EMAIL_*)
Symptôme :
- `Variable d'environnement requise manquante: PORT`
- `... EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD`

Actions :
1. Vérifier que le fichier `/.env` existe à la racine.
2. Vérifier le contenu effectif vu par compose :

```powershell
docker compose config | Select-String -Pattern "PORT|EMAIL_HOST|EMAIL_USER|EMAIL_PASSWORD"
```

3. Recréer backend :

```powershell
docker compose up -d --force-recreate --no-deps backend
```

## 3.2 Erreur: `SequelizeAccessDeniedError` (MySQL)
Symptôme :
- `Access denied for user 'root'@'...'`

Cause fréquente :
- Le volume MySQL a été initialisé avec d’anciens credentials, différents du `.env` actuel.

### Option A (recommandée en DEV): reset complet
```powershell
docker compose down -v
docker compose up -d --build
```

### Option B: aligner les credentials sans reset
- Ajuster `DB_USER`/`DB_PASSWORD` dans `/.env` pour correspondre à l’utilisateur MySQL réellement créé.
- Puis recréer backend :

```powershell
docker compose up -d --force-recreate --no-deps backend
```

---

# 4) Commandes Docker utiles

## Démarrage / arrêt
```powershell
docker compose up -d --build
docker compose down
docker compose down -v
```

## Logs
```powershell
docker compose logs -f
docker compose logs backend --tail 100
docker compose logs mysql --tail 100
```

## Recréer un seul service
```powershell
docker compose up -d --force-recreate --no-deps backend
```

---

# 5) Commandes Git utilisées pendant l’intervention

```powershell
git fetch origin samy
git checkout develop
git merge origin/samy
# résolution conflits
git commit --no-edit
git push origin develop
```

---

# 6) Checklist finale

- [ ] `docker compose ps` montre backend/mysql/redis actifs.
- [ ] `docker compose logs backend --tail 50` sans erreur DB.
- [ ] `http://localhost:3001/health` répond.
- [ ] `http://localhost:3000` est accessible.
- [ ] Formulaire événement sans warnings i18n/Select.

