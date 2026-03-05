# Quick Start Docker — EventCulture

## 1) Prérequis
- Docker Desktop démarré
- Terminal ouvert à la racine du projet :

```powershell
cd c:\Users\sabab\EventCulture
```

## 2) Préparer `.env` (une seule fois)

```powershell
Copy-Item .env.example .env
```

Ensuite, vérifier au minimum dans `/.env` :

```env
DB_HOST=mysql
DB_PORT=3306
DB_NAME=actionculture
DB_USER=actionculture_user
DB_PASSWORD=CHANGER_MOT_DE_PASSE_USER_MINIMUM_16_CARACTERES
PORT=3001
JWT_SECRET=VOTRE_SECRET
VITE_API_URL=http://localhost:3001/api
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
```

## 3) Lancer l'application

```powershell
docker compose up -d --build
```

## 4) Vérifier rapidement

```powershell
docker compose ps
docker compose logs backend --tail 50
```

## 5) Accès
- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- Health: http://localhost:3001/health

---

## Commandes utiles

### Redémarrer backend uniquement
```powershell
docker compose up -d --force-recreate --no-deps backend
```

### Voir les logs
```powershell
docker compose logs -f
docker compose logs mysql --tail 100
```

### Arrêter
```powershell
docker compose down
```

### Reset complet (DEV)
⚠️ Supprime les données locales MySQL/Redis.

```powershell
docker compose down -v
docker compose up -d --build
```

---

## Dépannage express

### Erreur `SequelizeAccessDeniedError`
- Cause: `DB_USER/DB_PASSWORD` dans `.env` ne correspondent pas aux credentials MySQL du volume existant.
- Solution rapide:
  1. Aligner `DB_USER/DB_PASSWORD` dans `.env`
  2. `docker compose up -d --force-recreate --no-deps backend`
  3. ou reset complet `docker compose down -v`
