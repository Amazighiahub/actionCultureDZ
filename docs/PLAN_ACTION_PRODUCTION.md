# Plan d'action — Mise en production Docker

**Basé sur** : `docs/ANALYSE_EXISTANT_PRODUCTION.md`

---

## Corrections appliquées

- [x] Credentials Cypress alignés avec seeds (`admin123`, `password123`)
- [x] Migrations dans `deploy.sh` (init + update)
- [x] `sequelize-cli` en dépendance (pour conteneur prod)

---

## Ordre des tâches — Pré-production

### 1. Vérifier `.env`

```powershell
# Copier si manquant
Copy-Item .env.example .env
# Éditer : DB_PASSWORD, JWT_SECRET (node backend/scripts/generateSecret.js)
```

### 2. Lancer Docker (dev)

```powershell
docker compose up -d --build
```

### 3. Attendre et tester

- Frontend : http://localhost:3000
- API : http://localhost:3001/health

### 4. Charger les seeds (premier lancement)

```powershell
# Avec Git Bash ou WSL
bash backend/database/seeds/run-seeds-mysql.sh

# Ou manuellement : exécuter seed-reference-data.sql via client MySQL
```

### 5. Tests

```powershell
# Backend
cd backend; npm test

# Frontend build
cd frontEnd; npm run build

# E2E (Docker doit tourner)
cd frontEnd; npm run e2e
```

---

## Commandes utiles (Windows)

| Action | Commande |
|--------|----------|
| Démarrer | `docker compose up -d` |
| Arrêter | `docker compose down` |
| Logs | `docker compose logs -f backend` |
| Status | `docker compose ps` |
| Seed (Bash) | `bash backend/database/seeds/run-seeds-mysql.sh` |

---

## Production

```bash
./scripts/deploy.sh --init   # Premier déploiement
./scripts/deploy.sh --ssl votredomaine.com
./scripts/deploy.sh --seed
```

Variables obligatoires : `JWT_SECRET`, `DB_*`, `FRONTEND_URL`, `VITE_API_URL`, `API_URL`.
