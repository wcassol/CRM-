#!/usr/bin/env bash
# =============================================================================
# CRM JURÍDICO — Script de Deploy Manual (VPS Hostinger)
# Uso: ./scripts/deploy.sh [--skip-migrations] [--force]
#
# Pré-requisitos no VPS:
#   - Docker + Docker Compose instalados
#   - Arquivo .env preenchido (cp .env.example .env)
#   - Acesso ao repositório Git
# =============================================================================

set -euo pipefail

# ─── Configurações ───────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-/opt/crm-juridico}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
GIT_BRANCH="${GIT_BRANCH:-main}"
LOG_FILE="/var/log/crm-deploy.log"

SKIP_MIGRATIONS=false
FORCE_REBUILD=false

# Parse args
for arg in "$@"; do
  case $arg in
    --skip-migrations) SKIP_MIGRATIONS=true ;;
    --force)           FORCE_REBUILD=true ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
ok()   { log "✅ $*"; }
warn() { log "⚠️  $*"; }
fail() { log "❌ $*"; exit 1; }

# ─── Pré-verificações ────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════"
log "🚀 Iniciando deploy CRM Jurídico"
log "   Branch: $GIT_BRANCH | Diretório: $APP_DIR"
log "═══════════════════════════════════════════════"

command -v docker      >/dev/null 2>&1 || fail "Docker não encontrado. Instale em: https://docs.docker.com/engine/install/"
command -v git         >/dev/null 2>&1 || fail "Git não encontrado."
[[ -f "$ENV_FILE" ]]                   || fail ".env não encontrado em $APP_DIR. Execute: cp .env.example .env"

# ─── 1. Atualizar código ─────────────────────────────────────────────────────
log "📥 Atualizando código do repositório..."
cd "$APP_DIR"

git fetch origin "$GIT_BRANCH"
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "origin/$GIT_BRANCH")

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]] && [[ "$FORCE_REBUILD" == "false" ]]; then
  warn "Nenhuma atualização disponível. Use --force para rebuildar mesmo assim."
  ok "Deploy cancelado — já na versão mais recente."
  exit 0
fi

git pull origin "$GIT_BRANCH"
NEW_SHA=$(git rev-parse --short HEAD)
ok "Código atualizado: $NEW_SHA"

# ─── 2. Validar variáveis de ambiente ────────────────────────────────────────
log "🔑 Validando variáveis de ambiente..."

REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  N8N_INTERNAL_API_KEY
)

source "$ENV_FILE"

missing=()
for var in "${REQUIRED_VARS[@]}"; do
  [[ -z "${!var:-}" ]] && missing+=("$var")
done

if [[ ${#missing[@]} -gt 0 ]]; then
  fail "Variáveis obrigatórias não definidas: ${missing[*]}"
fi
ok "Variáveis de ambiente OK"

# ─── 3. Executar migrations Supabase ─────────────────────────────────────────
if [[ "$SKIP_MIGRATIONS" == "false" ]]; then
  log "🗄️  Executando migrations do banco..."
  if command -v supabase >/dev/null 2>&1; then
    supabase db push --linked || warn "Falha nas migrations (verifique manualmente)"
    ok "Migrations executadas"
  else
    warn "Supabase CLI não instalado — migrations ignoradas. Execute manualmente."
    warn "  npm install -g supabase && supabase db push --linked"
  fi
fi

# ─── 4. Build da imagem Docker ───────────────────────────────────────────────
log "🐳 Construindo imagem Docker..."

source "$ENV_FILE"  # garante vars disponíveis para build args

docker compose -f "$COMPOSE_FILE" build \
  --build-arg "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-}" \
  app

ok "Imagem construída"

# ─── 5. Deploy com zero-downtime ─────────────────────────────────────────────
log "🔄 Reiniciando serviços (zero-downtime)..."

# Inicia novo container antes de parar o antigo
docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale app=2 app
sleep 10  # aguarda health check do novo container

# Remove containers antigos
docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale app=1 app

ok "Serviços reiniciados"

# ─── 6. Verificar saúde ──────────────────────────────────────────────────────
log "🏥 Aguardando health check..."
sleep 5

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
MAX_RETRIES=10
count=0

until curl -sf "$APP_URL/api/health" >/dev/null 2>&1; do
  count=$((count + 1))
  [[ $count -ge $MAX_RETRIES ]] && fail "Health check falhou após ${MAX_RETRIES} tentativas. Verifique os logs: docker compose logs app"
  log "   Aguardando... ($count/$MAX_RETRIES)"
  sleep 5
done

HEALTH=$(curl -sf "$APP_URL/api/health" 2>/dev/null || echo '{"status":"unknown"}')
ok "Health check OK: $HEALTH"

# ─── 7. Limpeza ──────────────────────────────────────────────────────────────
log "🧹 Removendo imagens antigas..."
docker image prune -f --filter "until=24h" >/dev/null 2>&1 || true
ok "Limpeza concluída"

# ─── Fim ─────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════"
ok "Deploy concluído! Versão: $NEW_SHA"
log "   App:  $APP_URL"
log "   n8n:  ${N8N_WEBHOOK_URL:-http://localhost:5678}"
log "═══════════════════════════════════════════════"
