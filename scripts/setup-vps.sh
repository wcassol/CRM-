#!/usr/bin/env bash
# =============================================================================
# CRM JURÍDICO — Setup inicial do VPS Hostinger
# Instala Docker, cria usuário, configura firewall e clona o repositório
#
# Uso (como root no VPS):
#   curl -fsSL https://raw.githubusercontent.com/SEU_ORG/crm-juridico/main/scripts/setup-vps.sh | bash
#   # ou
#   bash scripts/setup-vps.sh
# =============================================================================

set -euo pipefail

log()  { echo "[SETUP] $*"; }
ok()   { echo "[SETUP] ✅ $*"; }
fail() { echo "[SETUP] ❌ $*"; exit 1; }

[[ $EUID -eq 0 ]] || fail "Execute como root: sudo bash setup-vps.sh"

# ─── Configurações ───────────────────────────────────────────────────────────
APP_USER="crm"
APP_DIR="/opt/crm-juridico"
GIT_REPO="${GIT_REPO:-https://github.com/SEU_ORG/crm-juridico.git}"

log "Iniciando setup VPS..."
log "Distro: $(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY | cut -d= -f2)"

# ─── 1. Atualizar sistema ────────────────────────────────────────────────────
log "Atualizando pacotes..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip jq \
  ca-certificates gnupg lsb-release \
  ufw fail2ban \
  htop iotop \
  logrotate

ok "Pacotes instalados"

# ─── 2. Configurar Firewall (UFW) ────────────────────────────────────────────
log "Configurando firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP (redirect para HTTPS)"
ufw allow 443/tcp   comment "HTTPS (app)"
# n8n fica por trás do EasyPanel proxy — não expor diretamente
# ufw allow 5678/tcp comment "n8n (gerenciado pelo EasyPanel)"
ufw --force enable
ok "Firewall configurado"

# ─── 3. Configurar fail2ban ──────────────────────────────────────────────────
log "Configurando fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = 22
maxretry = 3
bantime  = 86400
EOF
systemctl enable fail2ban
systemctl restart fail2ban
ok "fail2ban configurado"

# ─── 4. Instalar Docker ──────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker..."
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  ok "Docker instalado: $(docker --version)"
else
  ok "Docker já instalado: $(docker --version)"
fi

# ─── 5. Criar usuário da aplicação ──────────────────────────────────────────
if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Criando usuário $APP_USER..."
  useradd -m -s /bin/bash -G docker "$APP_USER"
  ok "Usuário $APP_USER criado"
else
  ok "Usuário $APP_USER já existe"
  usermod -aG docker "$APP_USER"
fi

# ─── 6. Clonar repositório ──────────────────────────────────────────────────
if [[ ! -d "$APP_DIR/.git" ]]; then
  log "Clonando repositório..."
  git clone "$GIT_REPO" "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
  ok "Repositório clonado em $APP_DIR"
else
  ok "Repositório já existe em $APP_DIR"
fi

# ─── 7. Configurar logrotate ─────────────────────────────────────────────────
cat > /etc/logrotate.d/crm-juridico << 'EOF'
/var/log/crm-deploy.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  notifempty
  create 640 root adm
}
EOF

# ─── 8. Instalar Supabase CLI ────────────────────────────────────────────────
if ! command -v supabase >/dev/null 2>&1; then
  log "Instalando Supabase CLI..."
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin supabase
  ok "Supabase CLI instalado: $(supabase --version)"
fi

# ─── 9. Configurar variáveis de ambiente ─────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  log ""
  log "⚠️  AÇÃO NECESSÁRIA: Preencha as variáveis de ambiente:"
  log "    nano $APP_DIR/.env"
  log ""
fi

# ─── Fim ─────────────────────────────────────────────────────────────────────
ok "Setup VPS concluído!"
log ""
log "Próximos passos:"
log "  1. Editar variáveis: nano $APP_DIR/.env"
log "  2. Fazer deploy:     su - $APP_USER -c '$APP_DIR/scripts/deploy.sh'"
log ""
