# ============================================================
# Makefile - EventCulture
# ============================================================
# Commandes disponibles:
#   make setup         Setup complet (1ere utilisation)
#   make up            Lancer les conteneurs
#   make down          Arreter les conteneurs
#   make seed          Charger les donnees de reference
#   make reset         Tout supprimer et recommencer
#   make build         Rebuild les images Docker
#   make logs          Voir les logs en temps reel
#   make status        Etat des conteneurs
#   make shell-backend Shell dans le conteneur backend
#   make shell-mysql   Shell MySQL interactif
#   make migrate       Lancer les migrations en attente
#   make check-duplicates  Verifier doublons de fichiers (casse)
# ============================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Detect OS for compatibility
UNAME := $(shell uname -s 2>/dev/null || echo Windows)

# Docker compose command (v2 plugin vs standalone)
COMPOSE := $(shell command -v docker-compose 2>/dev/null || echo "docker compose")

.PHONY: help setup up down seed reset build logs logs-backend status \
        shell-backend shell-mysql enable-sync disable-sync migrate \
        prod-up prod-down prod-build prod-logs prod-status \
        check-env check-duplicates

# ============================================================
# AIDE
# ============================================================

help:
	@echo ""
	@echo "  EventCulture - Commandes disponibles"
	@echo "  ====================================="
	@echo ""
	@echo "  make setup            Setup complet (1ere utilisation)"
	@echo "  make up               Lancer les conteneurs"
	@echo "  make down             Arreter les conteneurs"
	@echo "  make seed             Charger les donnees de reference"
	@echo "  make reset            Tout supprimer et recommencer"
	@echo "  make build            Rebuild les images Docker"
	@echo "  make logs             Voir les logs en temps reel"
	@echo "  make logs-backend     Logs backend uniquement"
	@echo "  make status           Etat des conteneurs"
	@echo "  make shell-backend    Shell dans le conteneur backend"
	@echo "  make shell-mysql      Shell MySQL interactif"
	@echo "  make migrate          Lancer les migrations en attente"
	@echo "  make check-duplicates Verifier doublons de fichiers (casse)"
	@echo ""
	@echo "  --- Production ---"
	@echo "  make prod-up          Lancer en production"
	@echo "  make prod-down        Arreter la production"
	@echo "  make prod-build       Rebuild production"
	@echo "  make prod-logs        Logs production"
	@echo ""
	@echo "  --- Workflow nouveau developpeur ---"
	@echo "  1. cp .env.example .env && configurer les valeurs"
	@echo "  2. make setup"
	@echo ""

# ============================================================
# SETUP COMPLET
# ============================================================
# 1. Verifie que .env existe
# 2. Active DB_SYNC=true
# 3. Lance Docker (tables creees par Sequelize au demarrage)
# 4. Charge les seeds (donnees de reference)
# 5. Desactive DB_SYNC=false
# ============================================================

setup: check-env enable-sync
	@echo ""
	@echo "[setup] Lancement des conteneurs..."
	$(COMPOSE) up -d --build
	@echo ""
	@echo "[setup] Chargement des seeds..."
	@bash backend/database/seeds/run-seeds-mysql.sh || { $(MAKE) disable-sync; exit 1; }
	@$(MAKE) disable-sync
	@echo ""
	@echo "[setup] Termine! Application disponible sur http://localhost:3000"

# ============================================================
# COMMANDES PRINCIPALES
# ============================================================

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

seed:
	@bash backend/database/seeds/run-seeds-mysql.sh

reset:
	@echo "[reset] Suppression de tous les conteneurs et volumes..."
	$(COMPOSE) down -v --remove-orphans
	@$(MAKE) setup

build:
	$(COMPOSE) build --no-cache

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

status:
	$(COMPOSE) ps

# ============================================================
# SHELL INTERACTIF
# ============================================================

shell-backend:
	docker exec -it eventculture-backend sh

shell-mysql:
	docker exec -it eventculture-mysql mysql -u root -p$${MYSQL_ROOT_PASSWORD:-root} actionculture

# ============================================================
# MIGRATIONS
# ============================================================

migrate:
	@echo "[migrate] Execution des migrations..."
	docker exec eventculture-backend node -e " \
		const fs = require('fs'); \
		const path = require('path'); \
		const { sequelize } = require('./models'); \
		const dir = './migrations'; \
		(async () => { \
			const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort(); \
			for (const f of files) { \
				console.log('Running: ' + f); \
				const m = require(path.join(process.cwd(), dir, f)); \
				await m.up(sequelize.getQueryInterface(), sequelize.constructor); \
			} \
			console.log('Done.'); \
			process.exit(0); \
		})().catch(e => { console.error(e.message); process.exit(1); }); \
	"

# ============================================================
# GESTION DB_SYNC
# ============================================================
# sed -i.bak + rm : compatible macOS (BSD sed) et Linux (GNU sed)
# ============================================================

enable-sync:
	@echo "[sync] Activation DB_SYNC=true..."
	@if [ -f .env ]; then sed -i.bak 's/^DB_SYNC=false/DB_SYNC=true/' .env && rm -f .env.bak; fi
	@if [ -f backend/.env ]; then sed -i.bak 's/^DB_SYNC=false/DB_SYNC=true/' backend/.env && rm -f backend/.env.bak; fi
	@echo "[sync] DB_SYNC=true"

disable-sync:
	@echo "[sync] Desactivation DB_SYNC..."
	@if [ -f .env ]; then sed -i.bak 's/^DB_SYNC=true/DB_SYNC=false/' .env && rm -f .env.bak; fi
	@if [ -f backend/.env ]; then sed -i.bak 's/^DB_SYNC=true/DB_SYNC=false/' backend/.env && rm -f backend/.env.bak; fi
	@echo "[sync] DB_SYNC=false"

check-env:
	@if [ ! -f .env ]; then \
		echo "[error] Fichier .env manquant!"; \
		echo "  Copiez .env.example vers .env et configurez:"; \
		echo "  cp .env.example .env"; \
		exit 1; \
	fi
	@echo "[check] Fichier .env trouve"

# ============================================================
# VERIFICATION DOUBLONS (casse ui vs UI)
# ============================================================

check-duplicates:
	@bash scripts/check-duplicates.sh

# ============================================================
# PRODUCTION (docker-compose.prod.yml)
# ============================================================

prod-up:
	$(COMPOSE) -f docker-compose.prod.yml up -d

prod-down:
	$(COMPOSE) -f docker-compose.prod.yml down

prod-build:
	$(COMPOSE) -f docker-compose.prod.yml build --no-cache

prod-logs:
	$(COMPOSE) -f docker-compose.prod.yml logs -f

prod-status:
	$(COMPOSE) -f docker-compose.prod.yml ps
