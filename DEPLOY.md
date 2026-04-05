# Deploy — CRM Jurídico

Checklist completo para colocar o sistema em produção no VPS Hostinger + EasyPanel.

---

## Pré-requisitos

| Item | Versão mínima | Verificação |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| Docker | 24+ | `docker --version` |
| Supabase CLI | 1.180+ | `supabase --version` |
| VPS Hostinger | 2 vCPU / 4 GB RAM | Painel Hostinger |

---

## FASE 1 — Supabase

### 1.1 Criar projeto

1. Acesse [app.supabase.com](https://app.supabase.com) → New Project
2. Anote: **Project URL**, **anon key**, **service_role key**
3. Na aba **Settings → Database**, anote a **connection string** (para migrations)

### 1.2 Executar migrations

```bash
# Linkar CLI ao projeto remoto
supabase link --project-ref SEU_PROJECT_REF

# Executar todas as migrations (00001 → 00007)
supabase db push

# Verificar resultado
supabase db diff
```

**Ordem das migrations:**
```
00001_initial_schema.sql    → 20 tabelas, 15 enums
00002_indexes.sql           → índices + GIN full-text
00003_rls_policies.sql      → RLS em todas as tabelas
00004_triggers_functions.sql → triggers automáticos
00005_seed_data.sql         → dados iniciais (roles, fontes, motivos)
00006_storage_views.sql     → 6 views otimizadas
00007_webhook_helpers.sql   → funções de webhook + ajustes
```

### 1.3 Configurar Storage

No painel Supabase → Storage → New Bucket:

| Bucket | Public | Uso |
|---|---|---|
| `documents` | ❌ | Documentos dos clientes |
| `avatars` | ✅ | Fotos de perfil dos usuários |
| `contracts` | ❌ | PDFs de contratos |

### 1.4 Configurar Auth

Em **Authentication → Settings**:
- **Site URL**: `https://crm.seudominio.com.br`
- **Redirect URLs**: `https://crm.seudominio.com.br/**`
- Desabilitar Sign Up público (apenas convites)

Em **Authentication → Email Templates**, personalizar:
- Convite de usuário
- Reset de senha

### 1.5 Criar usuário admin inicial

```sql
-- Execute no SQL Editor do Supabase
-- Após criar o usuário pelo Auth > Users > Invite User
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'admin@seuescritorio.com.br';
```

---

## FASE 2 — VPS Hostinger

### 2.1 Provisionar servidor

No painel Hostinger → VPS:
- **Plano mínimo**: KVM 2 (2 vCPU, 8 GB RAM, 100 GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Localização**: Brasil (São Paulo)

### 2.2 Setup inicial

```bash
# Conectar ao VPS
ssh root@SEU_IP_VPS

# Executar script de setup (instala Docker, UFW, fail2ban)
curl -fsSL https://raw.githubusercontent.com/SEU_ORG/crm-juridico/main/scripts/setup-vps.sh | bash
```

O script configura:
- ✅ Docker + Docker Compose
- ✅ UFW (portas: 22, 80, 443)
- ✅ fail2ban (proteção SSH)
- ✅ Usuário `crm` sem root
- ✅ Logrotate para `/var/log/crm-deploy.log`

### 2.3 Configurar variáveis de ambiente

```bash
nano /opt/crm-juridico/.env
```

**Variáveis obrigatórias para funcionar:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://crm.seudominio.com.br

# Segurança interna
N8N_INTERNAL_API_KEY=$(openssl rand -hex 32)
WEBHOOK_SECRET_LEAD_ENTRADA=$(openssl rand -hex 32)
```

---

## FASE 3 — EasyPanel

### 3.1 Instalar EasyPanel

```bash
# No VPS como root
curl -sSL https://easypanel.io/install.sh | sh
```

Acesse: `https://SEU_IP_VPS:3000` e crie a conta admin.

### 3.2 Configurar domínio

Em EasyPanel → Settings → Domains:
- Adicionar `crm.seudominio.com.br` (app)
- Adicionar `n8n.seudominio.com.br` (n8n)

No painel DNS do domínio, criar registros:
```
A  crm  SEU_IP_VPS  (TTL: 300)
A  n8n  SEU_IP_VPS  (TTL: 300)
```

### 3.3 Criar projeto e serviços

1. EasyPanel → Projects → Create → `crm-juridico`
2. Importar configuração: **Services → Import JSON** → colar conteúdo de `easypanel/app.json`
3. Ou criar manualmente:

**Serviço `app` (Next.js):**
- Source: Git → `https://github.com/SEU_ORG/crm-juridico.git`
- Branch: `main`
- Build: Dockerfile
- Domain: `crm.seudominio.com.br` → porta 3000
- Auto-deploy: ✅

**Serviço `n8n`:**
- Source: Docker Image → `n8nio/n8n:latest`
- Domain: `n8n.seudominio.com.br` → porta 5678
- Volume: `/home/node/.n8n`

### 3.4 Preencher variáveis no EasyPanel

Para cada serviço, em **Environment**:

> Copiar valores do `.env` e preencher no painel. As variáveis **NEXT_PUBLIC_*** também precisam ser definidas como **Build Args** no serviço `app`.

### 3.5 SSL automático

EasyPanel provisiona Let's Encrypt automaticamente quando o domínio está apontando para o servidor. Aguardar 5 minutos após criar os serviços.

---

## FASE 4 — n8n

### 4.1 Acessar o painel

`https://n8n.seudominio.com.br` → login com as credenciais configuradas

### 4.2 Importar workflows

```bash
# Via script (requer N8N_API_KEY gerado no painel n8n)
N8N_URL=https://n8n.seudominio.com.br \
N8N_API_KEY=seu_api_key \
bash /opt/crm-juridico/scripts/import-n8n-workflows.sh
```

Ou manualmente: **Workflows → Import from File** → selecionar cada arquivo em `n8n/workflows/`

### 4.3 Configurar variáveis nos workflows

No painel n8n → **Settings → Variables**, adicionar:
- `CRM_BASE_URL` = `https://crm.seudominio.com.br`
- `N8N_INTERNAL_API_KEY` = mesmo valor do `.env`
- Credenciais das integrações (Asaas, ZapSign, etc.)

### 4.4 Configurar credenciais dos nodes

Em cada workflow, clicar nos nodes HTTP Request e configurar headers. Recomendado: usar **Credentials** do n8n para armazenar chaves de forma segura.

### 4.5 Configurar webhooks externos

Para cada serviço externo, registrar a URL do n8n como destino de webhook:

| Serviço | URL do Webhook n8n | Evento |
|---|---|---|
| ZapConnecta | `https://n8n.seudominio.com.br/webhook/zapconnecta-lead` | Novo lead |
| Cal.com | `https://n8n.seudominio.com.br/webhook/calcom-booking` | Todos os eventos |
| ZapSign | Diretamente → `https://crm.seudominio.com.br/api/webhooks/zapsign` | Todos os eventos |
| Asaas | Diretamente → `https://crm.seudominio.com.br/api/webhooks/asaas` | Pagamentos |

### 4.6 Ativar workflows

Ativar na ordem:
1. `01-lead-entrada` ✅
2. `08-reuniao-confirmacao` ✅
3. `02-follow-up-comercial` ✅ (agenda semanal)
4. `06-documentos-lembrete` ✅ (agenda diária)
5. `09-relatorio-semanal` ✅ (agenda segunda)
6. Demais workflows: ativar após testar cada integração

---

## FASE 5 — Verificação Final

### 5.1 Health checks

```bash
# App Next.js
curl https://crm.seudominio.com.br/api/health

# Resposta esperada:
# {"status":"ok","version":"0.1.0","checks":{"env_vars":{"status":"ok"},"supabase":{"status":"ok","latency_ms":45}}}

# n8n
curl https://n8n.seudominio.com.br/healthz
```

### 5.2 Smoke tests

| Teste | Como verificar | Esperado |
|---|---|---|
| Login | `https://crm.seudominio.com.br/login` | Redireciona para /dashboard |
| Supabase Auth | Fazer login com o usuário admin | Sessão criada |
| Criar lead | Dashboard → Novo Lead | Lead aparece no Kanban |
| Webhook lead | `POST /api/webhooks/lead-entrada` com payload teste | `{"ok":true}` |
| Notificações | Criar lead → verificar sino | Badge exibido |
| Timeline | Criar interação no lead | Aparece na timeline |
| Kanban DnD | Arrastar card entre colunas | Etapa atualizada |

### 5.3 Testes de integração (com sandbox)

```bash
# Teste do webhook Asaas (usar sandbox)
curl -X POST https://crm.seudominio.com.br/api/webhooks/asaas \
  -H "asaas-access-token: SEU_ASAAS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event":"PAYMENT_RECEIVED","payment":{"id":"pay_test_123","status":"RECEIVED","value":500,"dueDate":"2026-04-10","customer":"cus_test"}}'

# Teste do webhook ZapSign
curl -X POST https://crm.seudominio.com.br/api/webhooks/zapsign \
  -H "Content-Type: application/json" \
  -d '{"event_type":"signer_signed","document":{"token":"test_token","name":"Contrato Teste","status":"pending"},"signer":{"token":"sig_test","name":"João Silva","status":"signed","signed_at":"2026-04-05T10:00:00Z"}}'
```

---

## Observabilidade

### Logs em tempo real

```bash
# App Next.js
docker compose -f /opt/crm-juridico/docker-compose.yml logs -f app

# n8n
docker compose -f /opt/crm-juridico/docker-compose.yml logs -f n8n

# Todos os serviços
docker compose -f /opt/crm-juridico/docker-compose.yml logs -f
```

### Monitoramento de uptime

Configure um monitor externo (UptimeRobot, BetterUptime, etc.):
- **URL**: `https://crm.seudominio.com.br/api/health`
- **Intervalo**: 1 minuto
- **Alerta**: status HTTP ≠ 200 ou `"status":"error"` no body
- **Notificação**: WhatsApp + e-mail do admin

### Métricas do servidor

```bash
# CPU, RAM, disco
htop

# Uso de disco
df -h

# Containers Docker
docker stats

# Logs de segurança
fail2ban-client status sshd
```

### Backup automático

```bash
# Crontab para backup diário do volume n8n
crontab -e
# Adicionar:
# 0 3 * * * docker run --rm -v crm-n8n-data:/data -v /backups:/backup alpine tar czf /backup/n8n-$(date +%Y%m%d).tar.gz /data
# 0 4 * * * find /backups -name "n8n-*.tar.gz" -mtime +30 -delete
```

O banco Supabase tem backup automático diário (incluído no plano).

---

## Deploy de atualizações

```bash
# Deploy padrão (pull + build + restart)
bash /opt/crm-juridico/scripts/deploy.sh

# Forçar rebuild sem mudanças
bash /opt/crm-juridico/scripts/deploy.sh --force

# Apenas fazer deploy sem rodar migrations
bash /opt/crm-juridico/scripts/deploy.sh --skip-migrations
```

### Rollback

```bash
# Listar tags/commits disponíveis
cd /opt/crm-juridico && git log --oneline -10

# Rollback para commit específico
git checkout <commit-sha>
bash scripts/deploy.sh --force
```

---

## Segurança — Checklist

- [ ] Firewall UFW ativo (portas 22, 80, 443 apenas)
- [ ] fail2ban ativo e bloqueando brute force SSH
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca exposta ao browser
- [ ] `N8N_INTERNAL_API_KEY` em todas as chamadas CRM↔n8n
- [ ] Secrets dos webhooks configurados e validados (HMAC)
- [ ] Auth Supabase: sign up público **desabilitado**
- [ ] RLS ativo em **todas** as tabelas (verificar com `supabase db diff`)
- [ ] n8n: Basic Auth ativo com senha forte
- [ ] SSL/TLS Let's Encrypt ativo em todos os domínios
- [ ] `.env` com permissão `600` (apenas owner lê)
- [ ] Backups automáticos configurados
- [ ] Monitor de uptime configurado

---

## Variáveis de ambiente — Resumo

| Variável | Onde obter | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ |
| `N8N_INTERNAL_API_KEY` | `openssl rand -hex 32` | ✅ |
| `WEBHOOK_SECRET_LEAD_ENTRADA` | `openssl rand -hex 32` | ✅ |
| `ZAPSIGN_API_TOKEN` | ZapSign → Configurações → API | ✅ |
| `ZAPSIGN_WEBHOOK_SECRET` | ZapSign → Webhooks | ✅ |
| `ASAAS_API_KEY` | Asaas → Minha Conta → API | ✅ |
| `ASAAS_WEBHOOK_TOKEN` | Asaas → Configurações → Webhooks | ✅ |
| `CALCOM_API_KEY` | Cal.com → Settings → Developer | ✅ |
| `CALCOM_WEBHOOK_SECRET` | Cal.com → Webhooks | ✅ |
| `ASTREA_API_TOKEN` | Astrea → Integrações | ✅ |
| `ZAPCONNECTA_API_KEY` | ZapConnecta → API | ✅ |
| `ZAPCONNECTA_INSTANCE_ID` | ZapConnecta → Instâncias | ✅ |
| `SMTP_*` | Provedor de e-mail | Para relatórios |
| `ADMIN_WHATSAPP_NUMBER` | Número do admin | Para relatórios |

Consulte `.env.example` para a lista completa com descrições.
