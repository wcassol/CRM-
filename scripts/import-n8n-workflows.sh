#!/usr/bin/env bash
# =============================================================================
# CRM JURÍDICO — Importar workflows no n8n via API
# Uso: N8N_URL=https://n8n.seudominio.com N8N_API_KEY=... bash scripts/import-n8n-workflows.sh
# =============================================================================

set -euo pipefail

N8N_URL="${N8N_URL:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"
WORKFLOWS_DIR="$(dirname "$0")/../n8n/workflows"

log()  { echo "[n8n-import] $*"; }
ok()   { echo "[n8n-import] ✅ $*"; }
fail() { echo "[n8n-import] ❌ $*"; exit 1; }

[[ -d "$WORKFLOWS_DIR" ]] || fail "Diretório de workflows não encontrado: $WORKFLOWS_DIR"

# Monta header de autenticação
AUTH_HEADER=""
if [[ -n "$N8N_API_KEY" ]]; then
  AUTH_HEADER="X-N8N-API-KEY: $N8N_API_KEY"
elif [[ -n "${N8N_BASIC_AUTH_USER:-}" ]] && [[ -n "${N8N_BASIC_AUTH_PASSWORD:-}" ]]; then
  # Basic auth — obtém JWT primeiro
  TOKEN=$(curl -sf -X POST "$N8N_URL/api/v1/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${N8N_BASIC_AUTH_USER}\",\"password\":\"${N8N_BASIC_AUTH_PASSWORD}\"}" \
    | jq -r '.token // empty')
  [[ -n "$TOKEN" ]] || fail "Falha na autenticação com o n8n. Verifique N8N_BASIC_AUTH_USER e N8N_BASIC_AUTH_PASSWORD"
  AUTH_HEADER="Authorization: Bearer $TOKEN"
else
  fail "Configure N8N_API_KEY ou N8N_BASIC_AUTH_USER + N8N_BASIC_AUTH_PASSWORD"
fi

log "Importando workflows para $N8N_URL..."

imported=0
errors=0

for file in "$WORKFLOWS_DIR"/*.json; do
  name=$(basename "$file" .json)
  log "  → $name"

  response=$(curl -sf -X POST "$N8N_URL/api/v1/workflows" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d @"$file" 2>&1)

  if echo "$response" | jq -e '.id' >/dev/null 2>&1; then
    wf_id=$(echo "$response" | jq -r '.id')
    ok "  Workflow importado (ID: $wf_id): $name"
    imported=$((imported + 1))
  else
    echo "[n8n-import] ⚠️  Falha em '$name': $response"
    errors=$((errors + 1))
  fi
done

log ""
ok "Importação concluída: $imported importados, $errors erros"
log ""
log "Lembre-se de:"
log "  1. Ativar cada workflow manualmente no painel n8n"
log "  2. Configurar as credenciais nos nodes HTTP Request"
log "  3. Testar os workflows de forma manual antes de ativar"
