#!/bin/bash
# ============================================
# Script de configuration initiale du serveur
# ============================================
# A executer UNE SEULE FOIS sur un VPS OVH neuf
# Usage: ssh root@IP < scripts/setup-server.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }

DEPLOY_USER="deploy"

echo ""
echo "============================================"
echo "  Configuration du serveur - EventCulture"
echo "============================================"
echo ""

# ============================================
# 1. Mise a jour du systeme
# ============================================
log_info "1/8 - Mise a jour du systeme..."
apt update && apt upgrade -y
log_ok "Systeme a jour"

# ============================================
# 2. Creer l'utilisateur deploy
# ============================================
log_info "2/8 - Creation de l'utilisateur $DEPLOY_USER..."
if id "$DEPLOY_USER" &>/dev/null; then
    log_ok "Utilisateur $DEPLOY_USER existe deja"
else
    adduser --disabled-password --gecos "" $DEPLOY_USER
    usermod -aG sudo $DEPLOY_USER
    # Permettre sudo sans mot de passe pour deploy.sh
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/cp, /usr/bin/chown, /usr/sbin/nginx, /usr/bin/systemctl" > /etc/sudoers.d/$DEPLOY_USER
    chmod 440 /etc/sudoers.d/$DEPLOY_USER
    log_ok "Utilisateur $DEPLOY_USER cree"
fi

# ============================================
# 3. Configurer SSH securise
# ============================================
log_info "3/8 - Securisation SSH..."
mkdir -p /home/$DEPLOY_USER/.ssh
cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/ 2>/dev/null || true
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true

# Durcir la config SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config

systemctl restart sshd
log_ok "SSH securise (root desactive, cle SSH obligatoire)"

# ============================================
# 4. Pare-feu (UFW)
# ============================================
log_info "4/8 - Configuration du pare-feu..."
apt install ufw -y
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
log_ok "Pare-feu actif (SSH, HTTP, HTTPS)"

# ============================================
# 5. Fail2Ban (anti brute-force)
# ============================================
log_info "5/8 - Installation de Fail2Ban..."
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
log_ok "Fail2Ban actif"

# ============================================
# 6. Installer Docker
# ============================================
log_info "6/8 - Installation de Docker..."
if command -v docker &>/dev/null; then
    log_ok "Docker deja installe"
else
    apt install ca-certificates curl gnupg -y
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt update
    apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
    usermod -aG docker $DEPLOY_USER
    log_ok "Docker installe"
fi

# ============================================
# 7. Installer Git
# ============================================
log_info "7/8 - Installation de Git..."
apt install git -y
log_ok "Git installe"

# ============================================
# 8. Creer les dossiers du projet
# ============================================
log_info "8/8 - Preparation des dossiers..."
mkdir -p /home/EventCulture
chown $DEPLOY_USER:$DEPLOY_USER /home/EventCulture

mkdir -p /home/$DEPLOY_USER/backups
chown $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/backups

# Cron de sauvegarde automatique (tous les jours a 3h)
(crontab -u $DEPLOY_USER -l 2>/dev/null; echo "0 3 * * * cd /home/EventCulture && ./scripts/deploy.sh --backup 2>/dev/null") | crontab -u $DEPLOY_USER -

log_ok "Dossiers prets"

# ============================================
# Resume
# ============================================
echo ""
echo "============================================"
echo -e "${GREEN}  SERVEUR CONFIGURE${NC}"
echo "============================================"
echo ""
echo "Prochaines etapes :"
echo ""
echo "  1. Ajouter votre cle SSH publique :"
echo "     ssh-copy-id $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "  2. Se connecter en tant que $DEPLOY_USER :"
echo "     ssh $DEPLOY_USER@$(hostname -I | awk '{print $1}')"
echo ""
echo "  3. Cloner le projet :"
echo "     git clone <repo> /home/EventCulture"
echo ""
echo "  4. Configurer et deployer :"
echo "     cd /home/EventCulture"
echo "     cp .env.example .env && nano .env"
echo "     ./scripts/deploy.sh --init"
echo ""
echo "============================================"
