# ============================================================
# Makefile - EventCulture
# ============================================================
# Commandes disponibles:
#   make setup    → Setup complet depuis zéro (clone git → app prête)
#   make up       → Lancer les conteneurs
#   make down     → Arrêter les conteneurs
#   make seed     → Charger les données de référence
#   make reset    → Tout supprimer et recommencer (⚠️ efface les données)
#   make build    → Rebuild les images Docker
#   make logs     → Voir les logs en temps réel
#   make status   → État des conteneurs
#   make shell-backend → Shell dans le conteneur backend
#   make shell-mysql   → Shell MySQL interactif
# ============================================================

.PHONY: help setup up down seed reset build logs status \
        shell-backend shell-mysql enable-sync disable-sync \
        prod-up prod-down prod-build prod-logs prod-status

# Afficher l'aide par défaut
help:
	@echo ""
	@echo "  EventCulture - Commandes disponibles"
	@echo "  ====================================="
	@echo ""
	@echo "  make setup         Setup complet depuis zero (1ere utilisation)"
	@echo "  make up            Lancer les conteneurs"
	@echo "  make down          Arreter les conteneurs"
	@echo "  make seed          Charger les donnees de reference"
	@echo "  make reset         Tout supprimer et recommencer (perte de donnees!)"
	@echo "  make build         Rebuild les images Docker"
	@echo "  make logs          Voir les logs en temps reel"
	@echo "  make status        Etat des conteneurs"
	@echo "  make shell-backend Shell dans le conteneur backend"
	@echo "  make shell-mysql   Shell MySQL interactif"
	@echo ""
	@echo "  --- Workflow pour un nouveau developpeur ---"
	@echo "  1. Copier .env.example vers .env et configurer"
	@echo "  2. make setup"
	@echo ""

# ============================================================
# SETUP COMPLET - Pour un nouveau développeur
# ============================================================
# Workflow:
#   1. Vérifie que .env existe
#   2. Active DB_SYNC=true dans les .env
#   3. Lance Docker (tables créées par Sequelize au démarrage)
#   4. Attend que tout soit prêt
#   5. Charge les seeds (données de référence)
#   6. Désactive DB_SYNC=false automatiquement
# ============================================================
setup: check-env enable-sync
	@echo ""
	@echo "🚀 Lancement des conteneurs..."
	docker compose up -d --build
	@echo ""
	@echo "⏳ Chargement des seeds (attend que les tables soient créées)..."
	@bash backend/database/seeds/run-seeds-mysql.sh || ($(MAKE) disable-sync && exit 1)
	@echo ""
	@echo "✅ Setup terminé! Application disponible sur http://localhost:3000"

# Lancer les conteneurs (sans rebuild)
up:
	docker compose up -d

# Arrêter les conteneurs
down:
	docker compose down

# Charger les seeds (tables doivent exister)
seed:
	@bash backend/database/seeds/run-seeds-mysql.sh

# Reset complet: supprime tout et recommence
reset:
	@echo "⚠️  Suppression de tous les conteneurs et volumes..."
	docker compose down -v --remove-orphans
	@$(MAKE) setup

# Rebuild les images
build:
	docker compose build --no-cache

# Logs en temps réel
logs:
	docker compose logs -f

# Logs backend uniquement
logs-backend:
	docker compose logs -f backend

# État des conteneurs
status:
	docker compose ps

# Shell dans le backend
shell-backend:
	docker exec -it eventculture-backend sh

# Shell MySQL interactif
shell-mysql:
	docker exec -it eventculture-mysql mysql -u root -p$${MYSQL_ROOT_PASSWORD:-root} actionculture

# ============================================================
# Gestion de DB_SYNC
# ============================================================

# Activer DB_SYNC=true dans les deux .env
enable-sync:
	@echo "🔧 Activation DB_SYNC=true..."
	@if [ -f .env ]; then sed -i 's/^DB_SYNC=false/DB_SYNC=true/' .env; fi
	@if [ -f backend/.env ]; then sed -i 's/^DB_SYNC=false/DB_SYNC=true/' backend/.env; fi
	@echo "   ✅ DB_SYNC=true dans .env et backend/.env"

# Désactiver DB_SYNC=false dans les deux .env
disable-sync:
	@echo "🔧 Désactivation DB_SYNC → false..."
	@if [ -f .env ]; then sed -i 's/^DB_SYNC=true/DB_SYNC=false/' .env; fi
	@if [ -f backend/.env ]; then sed -i 's/^DB_SYNC=true/DB_SYNC=false/' backend/.env; fi
	@echo "   ✅ DB_SYNC=false dans .env et backend/.env"

# Vérifier que .env existe
check-env:
	@if [ ! -f .env ]; then \
		echo "❌ Fichier .env manquant!"; \
		echo "   Copiez .env.example vers .env et configurez les valeurs:"; \
		echo "   cp .env.example .env"; \
		exit 1; \
	fi
	@echo "✅ Fichier .env trouvé"

# ============================================================
# PRODUCTION (utilise docker-compose.prod.yml)
# ============================================================

prod-up:
	docker compose -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-build:
	docker compose -f docker-compose.prod.yml build --no-cache

prod-logs:
	docker compose -f docker-compose.prod.yml logs -f

prod-status:
	docker compose -f docker-compose.prod.yml ps
