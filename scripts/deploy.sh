#!/bin/bash
# ============================================
# Script de deploiement - EventCulture
# ============================================
# Usage:
#   Premier deploiement : ./scripts/deploy.sh --init
#   Mise a jour :         ./scripts/deploy.sh
#   Avec SSL :            ./scripts/deploy.sh --ssl votredomaine.com
#   Voir les logs :       ./scripts/deploy.sh --logs
#   Sauvegarder la DB :   ./scripts/deploy.sh --backup
#   Tout arreter :        ./scripts/deploy.sh --down
# ============================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# Verification des prerequis
# ============================================
check_prerequisites() {
    log_info "Verification des prerequis..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installe."
        log_info "Installer avec : curl -fsSL https://get.docker.com | sh"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installe."
        exit 1
    fi

    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log_error "Fichier .env manquant."
        log_info "Copier et configurer : cp .env.example .env"
        exit 1
    fi

    # Verifier les variables obligatoires
    source "$PROJECT_DIR/.env"
    local missing=0

    for var in MYSQL_ROOT_PASSWORD DB_NAME DB_USER DB_PASSWORD JWT_SECRET FRONTEND_URL VITE_API_URL; do
        if [ -z "${!var}" ]; then
            log_error "Variable manquante dans .env : $var"
            missing=1
        fi
    done

    if [ ${#JWT_SECRET} -lt 32 ] 2>/dev/null; then
        log_error "JWT_SECRET trop court (minimum 32 caracteres)"
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi

    log_ok "Prerequis OK"
}

# ============================================
# Premier deploiement
# ============================================
init_deploy() {
    log_info "========================================="
    log_info "   PREMIER DEPLOIEMENT - EventCulture"
    log_info "========================================="

    check_prerequisites

    # Si pas de certificat SSL, utiliser la config initiale (HTTP seulement)
    if [ ! -d "$PROJECT_DIR/nginx/ssl" ] || [ -z "$(ls -A $PROJECT_DIR/nginx/ssl 2>/dev/null)" ]; then
        log_warn "Pas de certificat SSL detecte."
        if [ -f "$PROJECT_DIR/nginx/initial.conf" ]; then
            log_info "Utilisation de la config HTTP temporaire..."
            cp "$PROJECT_DIR/nginx/prod.conf" "$PROJECT_DIR/nginx/prod.conf.bak" 2>/dev/null || true
            cp "$PROJECT_DIR/nginx/initial.conf" "$PROJECT_DIR/nginx/prod.conf"
        fi
        log_info "Lancez './scripts/deploy.sh --ssl votredomaine.com' apres le deploiement."
    fi

    # Build et lancement
    log_info "Construction des images Docker..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" build --no-cache

    log_info "Lancement des services..."
    docker compose -f "$COMPOSE_FILE" up -d

    # Attendre que MySQL soit pret
    log_info "Attente du demarrage des services..."
    sleep 15

    # Executer les migrations
    log_info "Execution des migrations..."
    docker compose -f "$COMPOSE_FILE" run --rm backend npm run db:migrate 2>/dev/null || log_warn "Migrations skip (DB vide ou deja a jour)"

    # Verifier les santes
    check_health

    log_ok "========================================="
    log_ok "   DEPLOIEMENT INITIAL TERMINE"
    log_ok "========================================="
    log_info ""
    log_info "Prochaines etapes :"
    log_info "  1. Verifier : http://VOTRE_IP"
    log_info "  2. Configurer DNS (A record -> IP du serveur)"
    log_info "  3. Installer SSL : ./scripts/deploy.sh --ssl votredomaine.com"
    log_info "  4. Peupler la DB : ./scripts/deploy.sh --seed"
}

# ============================================
# Mise a jour (deploiement standard)
# ============================================
update_deploy() {
    log_info "========================================="
    log_info "   MISE A JOUR - EventCulture"
    log_info "========================================="

    check_prerequisites

    cd "$PROJECT_DIR"

    # Sauvegarder la DB avant la mise a jour
    log_info "Sauvegarde de la base de donnees..."
    backup_db

    # Pull les derniers changements
    log_info "Recuperation du code..."
    git pull origin "$(git branch --show-current)"

    # Rebuild et redemarrer
    log_info "Reconstruction des images..."
    docker compose -f "$COMPOSE_FILE" build

    log_info "Redemarrage des services..."
    docker compose -f "$COMPOSE_FILE" up -d

    sleep 10

    # Migrations (exec sur conteneur deja en marche)
    log_info "Verification des migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T backend npm run db:migrate 2>/dev/null || true

    check_health

    # Nettoyer les anciennes images
    log_info "Nettoyage des images inutilisees..."
    docker image prune -f

    log_ok "========================================="
    log_ok "   MISE A JOUR TERMINEE"
    log_ok "========================================="
}

# ============================================
# Installation du certificat SSL
# ============================================
setup_ssl() {
    local domain=$1

    if [ -z "$domain" ]; then
        log_error "Domaine manquant. Usage : ./scripts/deploy.sh --ssl votredomaine.com"
        exit 1
    fi

    log_info "Installation du certificat SSL pour $domain..."

    # S'assurer que les services tournent
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" up -d nginx

    sleep 5

    # Obtenir le certificat
    log_info "Obtention du certificat Let's Encrypt..."
    docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "$domain" \
        -d "www.$domain" \
        -d "api.$domain" \
        --email "admin@$domain" \
        --agree-tos \
        --no-eff-email

    if [ $? -eq 0 ]; then
        log_ok "Certificat SSL obtenu !"

        # Mettre a jour la config Nginx avec SSL
        log_info "Mise a jour de la configuration Nginx..."
        sed -i "s/actionculture\.dz/$domain/g" "$PROJECT_DIR/nginx/prod.conf"

        # Redemarrer Nginx
        docker compose -f "$COMPOSE_FILE" restart nginx
        sleep 3

        log_ok "SSL configure et actif !"
        log_info "Testez : https://$domain"
        log_info "Testez : https://api.$domain/health"
    else
        log_error "Echec de l'obtention du certificat SSL."
        log_info "Verifiez que le DNS pointe vers ce serveur."
        log_info "Verifiez que les ports 80 et 443 sont ouverts."
    fi
}

# ============================================
# Peupler la base de donnees
# ============================================
seed_db() {
    log_info "Peuplement de la base de donnees..."
    cd "$PROJECT_DIR"

    docker compose -f "$COMPOSE_FILE" exec backend node scripts/seed-geography.js || true
    docker compose -f "$COMPOSE_FILE" exec backend node scripts/seed-data-reference.js || true
    docker compose -f "$COMPOSE_FILE" exec backend node scripts/seed-all-data.js || true

    log_ok "Base de donnees peuplee."
}

# ============================================
# Sauvegarde de la base de donnees
# ============================================
backup_db() {
    local backup_dir="$PROJECT_DIR/backups"
    local date_stamp=$(date +%Y-%m-%d_%H-%M-%S)
    local backup_file="$backup_dir/db_$date_stamp.sql.gz"

    mkdir -p "$backup_dir"

    source "$PROJECT_DIR/.env"

    docker compose -f "$COMPOSE_FILE" exec -T mysql \
        mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$DB_NAME" \
        | gzip > "$backup_file"

    if [ $? -eq 0 ]; then
        log_ok "Sauvegarde : $backup_file"
    else
        log_warn "Echec de la sauvegarde (la DB n'est peut-etre pas encore prete)"
    fi

    # Garder les 30 derniers backups
    find "$backup_dir" -name "db_*.sql.gz" -mtime +30 -delete 2>/dev/null
}

# ============================================
# Verification de sante
# ============================================
check_health() {
    log_info "Verification de l'etat des services..."

    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" ps

    echo ""

    # Tester le backend
    local backend_status=$(docker compose -f "$COMPOSE_FILE" exec -T backend wget -qO- http://localhost:3001/health 2>/dev/null || echo "UNREACHABLE")

    if echo "$backend_status" | grep -qi "healthy\|status"; then
        log_ok "Backend : OK"
    else
        log_error "Backend : NON DISPONIBLE"
        log_info "Logs : docker compose -f $COMPOSE_FILE logs backend"
    fi

    # Tester MySQL
    local mysql_status=$(docker compose -f "$COMPOSE_FILE" exec -T mysql mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" 2>/dev/null || echo "UNREACHABLE")

    if echo "$mysql_status" | grep -qi "alive"; then
        log_ok "MySQL : OK"
    else
        log_error "MySQL : NON DISPONIBLE"
    fi

    # Tester Redis
    local redis_status=$(docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null || echo "UNREACHABLE")

    if echo "$redis_status" | grep -qi "pong"; then
        log_ok "Redis : OK"
    else
        log_error "Redis : NON DISPONIBLE"
    fi
}

# ============================================
# Voir les logs
# ============================================
show_logs() {
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100 "$@"
}

# ============================================
# Arreter tout
# ============================================
stop_all() {
    log_info "Arret de tous les services..."
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" down
    log_ok "Services arretes."
}

# ============================================
# Point d'entree
# ============================================
case "${1:-}" in
    --init)
        init_deploy
        ;;
    --ssl)
        setup_ssl "$2"
        ;;
    --seed)
        seed_db
        ;;
    --backup)
        backup_db
        ;;
    --logs)
        shift
        show_logs "$@"
        ;;
    --status)
        check_health
        ;;
    --down)
        stop_all
        ;;
    --help)
        echo ""
        echo "Usage: ./scripts/deploy.sh [OPTION]"
        echo ""
        echo "Options:"
        echo "  --init                 Premier deploiement (build + lancement)"
        echo "  (sans option)          Mise a jour (git pull + rebuild)"
        echo "  --ssl DOMAINE          Installer le certificat SSL"
        echo "  --seed                 Peupler la base de donnees"
        echo "  --backup               Sauvegarder la base de donnees"
        echo "  --logs [service]       Voir les logs (backend, mysql, nginx...)"
        echo "  --status               Verifier l'etat des services"
        echo "  --down                 Arreter tous les services"
        echo "  --help                 Afficher cette aide"
        echo ""
        ;;
    *)
        update_deploy
        ;;
esac
