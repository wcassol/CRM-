-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00001: SCHEMA INICIAL
-- =============================================================================
-- Ordem de criação respeita dependências de FK:
--   1. Enums e domínios
--   2. Tabelas de referência (roles, lead_sources, loss_reasons)
--   3. Tabela users
--   4. Tabelas principais (leads e derivadas)
--   5. Tabelas de relacionamento
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSÕES
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- buscas sem acento


-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
  'admin',
  'comercial',
  'pre_juridico',
  'juridico',
  'financeiro'
);

CREATE TYPE pipeline_type AS ENUM (
  'comercial',
  'onboarding',
  'perdas'
);

-- Etapas comerciais
CREATE TYPE etapa_comercial AS ENUM (
  'novo_lead',
  'triagem_iniciada',
  'triagem_concluida',
  'aguardando_documentos',
  'em_analise_viabilidade',
  'reuniao_agendada',
  'reuniao_realizada',
  'proposta_enviada',
  'em_negociacao',
  'contrato_enviado',
  'assinado_aguardando_pagamento',
  'fechado'
);

-- Etapas de onboarding
CREATE TYPE etapa_onboarding AS ENUM (
  'pagamento_confirmado',
  'checklist_entrada',
  'documentacao_completa',
  'pasta_organizada',
  'cadastro_envio_astrea',
  'juridico_responsavel_definido',
  'cliente_ativo'
);

-- Etapas de perdas/reativação
CREATE TYPE etapa_perdas AS ENUM (
  'sem_viabilidade',
  'sem_documentos',
  'nao_respondeu',
  'nao_compareceu',
  'perdeu_por_preco',
  'fechou_com_concorrente',
  'reativacao_futura'
);

CREATE TYPE temperatura_lead AS ENUM ('frio', 'morno', 'quente');

CREATE TYPE viabilidade_tipo AS ENUM ('viavel', 'inviavel', 'pendente');

CREATE TYPE urgencia_tipo AS ENUM ('baixa', 'media', 'alta', 'critica');

CREATE TYPE interaction_tipo AS ENUM (
  'nota',
  'email',
  'whatsapp',
  'ligacao',
  'sistema',
  'reuniao',
  'tarefa'
);

CREATE TYPE document_status AS ENUM (
  'solicitado',
  'enviado',
  'validado',
  'recusado'
);

CREATE TYPE appointment_status AS ENUM (
  'agendada',
  'confirmada',
  'reagendada',
  'realizada',
  'faltou',
  'cancelada'
);

CREATE TYPE proposal_status AS ENUM (
  'rascunho',
  'enviada',
  'aceita',
  'recusada',
  'expirada'
);

CREATE TYPE contract_status AS ENUM (
  'pendente',
  'enviado',
  'assinado',
  'cancelado',
  'expirado'
);

CREATE TYPE charge_status AS ENUM (
  'pendente',
  'pago',
  'atrasado',
  'cancelado',
  'estornado'
);

CREATE TYPE task_prioridade AS ENUM ('baixa', 'media', 'alta', 'urgente');

CREATE TYPE task_status AS ENUM (
  'aberta',
  'em_andamento',
  'concluida',
  'cancelada'
);

CREATE TYPE onboarding_item_status AS ENUM (
  'pendente',
  'em_andamento',
  'concluido',
  'bloqueado'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'stage_change',
  'login',
  'logout',
  'webhook_received'
);


-- ---------------------------------------------------------------------------
-- 2. TABELAS DE REFERÊNCIA
-- ---------------------------------------------------------------------------

-- Perfis de acesso
CREATE TABLE roles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          user_role NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  permissions   JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Perfis de acesso do sistema com mapa de permissões em JSON.';
COMMENT ON COLUMN roles.permissions IS 'Mapa: { "modulo": { "acao": true|false } }';

-- Origens dos leads
CREATE TABLE lead_sources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  canal       TEXT,              -- whatsapp, formulario, anuncio, indicacao
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lead_sources IS 'Catálogo de origens de leads (WhatsApp, formulário, etc).';

-- Motivos de perda (por pipeline)
CREATE TABLE loss_reasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descricao   TEXT NOT NULL,
  pipeline    pipeline_type NOT NULL DEFAULT 'comercial',
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE loss_reasons IS 'Catálogo de motivos de perda. Obrigatório ao marcar lead como perdido.';

-- Requisitos de documentos por área jurídica
CREATE TABLE document_requirements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  area_juridica   TEXT NOT NULL,   -- previdenciario, trabalhista, civil, etc
  obrigatorio     BOOLEAN NOT NULL DEFAULT TRUE,
  instrucoes      TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE document_requirements IS 'Checklist padrão de documentos por área jurídica.';


-- ---------------------------------------------------------------------------
-- 3. USUÁRIOS
-- ---------------------------------------------------------------------------

-- Espelha auth.users do Supabase; estende com dados de negócio
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role_id       UUID NOT NULL REFERENCES roles(id),
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Perfil de negócio dos usuários. Vinculado a auth.users via mesmo UUID.';


-- ---------------------------------------------------------------------------
-- 4. LEADS (tabela central)
-- ---------------------------------------------------------------------------

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Dados básicos
  nome            TEXT NOT NULL,
  telefone        TEXT NOT NULL,
  email           TEXT,
  cpf             TEXT,                          -- armazenado criptografado via pgcrypto
  cidade          TEXT,
  estado          CHAR(2),

  -- Origem
  source_id       UUID REFERENCES lead_sources(id),
  campanha        TEXT,
  anuncio         TEXT,
  landing_page    TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,

  -- Caso jurídico
  area_juridica         TEXT,
  subtipo_caso          TEXT,
  resumo_caso           TEXT,
  parte_contraria       TEXT,
  data_fato             DATE,
  urgencia              urgencia_tipo DEFAULT 'media',
  prazo_sensivel        BOOLEAN DEFAULT FALSE,
  tentou_resolver_antes BOOLEAN DEFAULT FALSE,
  ja_tem_advogado       BOOLEAN DEFAULT FALSE,

  -- Qualificação
  viabilidade_preliminar  viabilidade_tipo,
  temperatura             temperatura_lead DEFAULT 'frio',
  chance_fechamento_pct   SMALLINT CHECK (chance_fechamento_pct BETWEEN 0 AND 100),
  proxima_acao            TEXT,
  data_proxima_acao       TIMESTAMPTZ,

  -- Responsáveis
  responsavel_comercial_id  UUID REFERENCES users(id),
  responsavel_juridico_id   UUID REFERENCES users(id),

  -- Comercial
  valor_proposto    NUMERIC(12, 2),
  ticket_fechado    NUMERIC(12, 2),
  objecao_principal TEXT,
  loss_reason_id    UUID REFERENCES loss_reasons(id),
  motivo_perda_obs  TEXT,

  -- Pipeline
  pipeline_atual    pipeline_type NOT NULL DEFAULT 'comercial',
  etapa_comercial   etapa_comercial NOT NULL DEFAULT 'novo_lead',
  etapa_onboarding  etapa_onboarding,
  etapa_perdas      etapa_perdas,

  -- Jurídico / Astrea
  status_onboarding   TEXT,
  data_envio_astrea   TIMESTAMPTZ,
  referencia_astrea   TEXT,
  enviado_astrea_por  UUID REFERENCES users(id),

  -- Controle
  created_by  UUID REFERENCES users(id),
  deleted_at  TIMESTAMPTZ,                    -- soft delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leads IS 'Tabela central do CRM. Armazena toda a jornada do lead até virar cliente ativo.';
COMMENT ON COLUMN leads.cpf IS 'Armazenar criptografado: pgp_sym_encrypt(cpf, app_secret)';
COMMENT ON COLUMN leads.deleted_at IS 'Soft delete. NULL = ativo. Preenchido = excluído logicamente.';


-- ---------------------------------------------------------------------------
-- 5. HISTÓRICO DE PIPELINE
-- ---------------------------------------------------------------------------

CREATE TABLE pipeline_history (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id          UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  pipeline         pipeline_type NOT NULL,
  etapa_anterior   TEXT,
  etapa_nova       TEXT NOT NULL,
  usuario_id       UUID REFERENCES users(id),
  motivo           TEXT,
  metadata         JSONB DEFAULT '{}',        -- dados extras da transição
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pipeline_history IS 'Log imutável de todas as mudanças de etapa. Nunca atualizar ou deletar.';


-- ---------------------------------------------------------------------------
-- 6. INTERAÇÕES
-- ---------------------------------------------------------------------------

CREATE TABLE lead_interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo        interaction_tipo NOT NULL DEFAULT 'nota',
  conteudo    TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',            -- dados extras por tipo
  usuario_id  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lead_interactions IS 'Timeline de interações: notas, ligações, WhatsApp, eventos de sistema.';


-- ---------------------------------------------------------------------------
-- 7. DOCUMENTOS
-- ---------------------------------------------------------------------------

CREATE TABLE lead_documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  requirement_id      UUID REFERENCES document_requirements(id),
  nome                TEXT NOT NULL,
  status              document_status NOT NULL DEFAULT 'solicitado',
  storage_path        TEXT,                  -- path no Supabase Storage
  mime_type           TEXT,
  tamanho_bytes       BIGINT,
  observacao_analista TEXT,
  enviado_em          TIMESTAMPTZ,
  validado_em         TIMESTAMPTZ,
  validado_por        UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lead_documents IS 'Documentos do lead com controle de status e validação pelo pré-jurídico.';


-- ---------------------------------------------------------------------------
-- 8. AGENDAMENTOS
-- ---------------------------------------------------------------------------

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  data_hora       TIMESTAMPTZ NOT NULL,
  duracao_min     SMALLINT DEFAULT 60,
  link_meet       TEXT,
  cal_event_id    TEXT UNIQUE,               -- ID externo do Cal.com
  status          appointment_status NOT NULL DEFAULT 'agendada',
  resultado       TEXT,
  observacoes     TEXT,
  criado_por      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE appointments IS 'Reuniões agendadas. Sincronizado via webhook do Cal.com.';


-- ---------------------------------------------------------------------------
-- 9. PROPOSTAS
-- ---------------------------------------------------------------------------

CREATE TABLE proposals (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  valor                   NUMERIC(12, 2) NOT NULL,
  condicao_pagamento      TEXT,
  observacoes             TEXT,
  objecoes                TEXT,
  chance_fechamento_pct   SMALLINT CHECK (chance_fechamento_pct BETWEEN 0 AND 100),
  status                  proposal_status NOT NULL DEFAULT 'rascunho',
  enviada_em              TIMESTAMPTZ,
  respondida_em           TIMESTAMPTZ,
  validade_dias           SMALLINT DEFAULT 7,
  criado_por              UUID REFERENCES users(id),
  deleted_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE proposals IS 'Propostas comerciais enviadas ao lead. Uma pode estar ativa por vez.';


-- ---------------------------------------------------------------------------
-- 10. CONTRATOS
-- ---------------------------------------------------------------------------

CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proposal_id     UUID REFERENCES proposals(id),
  zapsign_token   TEXT UNIQUE,               -- token do documento no ZapSign
  zapsign_doc_url TEXT,                      -- URL pública para assinatura
  status          contract_status NOT NULL DEFAULT 'pendente',
  link_documento  TEXT,
  enviado_em      TIMESTAMPTZ,
  assinado_em     TIMESTAMPTZ,
  enviado_por     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contracts IS 'Contratos gerados via ZapSign. Status atualizado por webhook.';


-- ---------------------------------------------------------------------------
-- 11. COBRANÇAS
-- ---------------------------------------------------------------------------

CREATE TABLE charges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  contract_id     UUID REFERENCES contracts(id),
  asaas_id        TEXT UNIQUE,               -- ID da cobrança no Asaas
  valor           NUMERIC(12, 2) NOT NULL,
  vencimento      DATE NOT NULL,
  link_pagamento  TEXT,
  status          charge_status NOT NULL DEFAULT 'pendente',
  pago_em         TIMESTAMPTZ,
  descricao       TEXT,
  criado_por      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE charges IS 'Cobranças geradas no Asaas. Status atualizado por webhook de pagamento.';


-- ---------------------------------------------------------------------------
-- 12. TAREFAS
-- ---------------------------------------------------------------------------

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,  -- nullable: tarefas gerais
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  responsavel_id  UUID REFERENCES users(id),
  vencimento      TIMESTAMPTZ,
  prioridade      task_prioridade NOT NULL DEFAULT 'media',
  status          task_status NOT NULL DEFAULT 'aberta',
  lembrete_em     TIMESTAMPTZ,
  concluida_em    TIMESTAMPTZ,
  concluida_por   UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tasks IS 'Tarefas vinculadas a leads ou gerais. Vencidas são destacadas no dashboard.';


-- ---------------------------------------------------------------------------
-- 13. ONBOARDING
-- ---------------------------------------------------------------------------

CREATE TABLE onboarding_checklists (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id                 UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  responsavel_juridico_id UUID REFERENCES users(id),
  status_geral            onboarding_item_status NOT NULL DEFAULT 'pendente',
  data_conclusao          TIMESTAMPTZ,
  referencia_astrea       TEXT,
  enviado_astrea_em       TIMESTAMPTZ,
  enviado_por             UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE onboarding_checklists IS '1:1 com leads. Criado automaticamente após pagamento confirmado.';

CREATE TABLE onboarding_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id    UUID NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  obrigatorio     BOOLEAN NOT NULL DEFAULT TRUE,
  ordem           SMALLINT NOT NULL DEFAULT 0,
  status          onboarding_item_status NOT NULL DEFAULT 'pendente',
  concluido_por   UUID REFERENCES users(id),
  concluido_em    TIMESTAMPTZ,
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE onboarding_items IS 'Itens individuais do checklist de onboarding. Todos obrigatórios devem estar concluídos antes do envio ao Astrea.';


-- ---------------------------------------------------------------------------
-- 14. TAGS
-- ---------------------------------------------------------------------------

CREATE TABLE lead_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, tag)
);

COMMENT ON TABLE lead_tags IS 'Tags livres para categorização e filtros rápidos.';


-- ---------------------------------------------------------------------------
-- 15. CAMPOS PERSONALIZADOS
-- ---------------------------------------------------------------------------

CREATE TABLE custom_field_definitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entidade        TEXT NOT NULL,             -- 'lead', 'appointment', etc
  nome            TEXT NOT NULL,
  label           TEXT NOT NULL,
  tipo            TEXT NOT NULL,             -- text, number, date, boolean, select
  opcoes          JSONB,                     -- para tipo = select
  obrigatorio     BOOLEAN DEFAULT FALSE,
  area_juridica   TEXT,                      -- NULL = todos
  ordem           SMALLINT DEFAULT 0,
  ativo           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_custom_fields (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id        UUID NOT NULL REFERENCES custom_field_definitions(id),
  valor           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, field_id)
);

COMMENT ON TABLE custom_field_definitions IS 'Define campos personalizados por entidade e área jurídica.';
COMMENT ON TABLE lead_custom_fields IS 'Valores dos campos personalizados por lead.';


-- ---------------------------------------------------------------------------
-- 16. INTEGRAÇÕES
-- ---------------------------------------------------------------------------

CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT NOT NULL UNIQUE,      -- zapsign, asaas, calcom, n8n, astrea
  display_name    TEXT NOT NULL,
  config          JSONB NOT NULL DEFAULT '{}',  -- tokens, URLs (criptografado em app)
  webhook_secret  TEXT,
  ativo           BOOLEAN DEFAULT FALSE,
  last_sync_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE integrations IS 'Configuração das integrações externas. config armazenado criptografado pela aplicação.';


-- ---------------------------------------------------------------------------
-- 17. NOTIFICAÇÕES
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,               -- tarefa_vencida, lead_atribuido, etc
  titulo        TEXT NOT NULL,
  mensagem      TEXT,
  entity_type   TEXT,                        -- lead, task, appointment, etc
  entity_id     UUID,
  lida          BOOLEAN NOT NULL DEFAULT FALSE,
  lida_em       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Notificações in-app por usuário. Supabase Realtime notifica o frontend.';


-- ---------------------------------------------------------------------------
-- 18. AUDIT LOGS (IMUTÁVEL)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  action           audit_action NOT NULL,
  usuario_id       UUID REFERENCES users(id),
  dados_anteriores JSONB,
  dados_novos      JSONB,
  ip_address       INET,
  user_agent       TEXT,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- SEM updated_at: esta tabela é imutável
);

COMMENT ON TABLE audit_logs IS 'Log imutável de todas as ações sensíveis. Nenhum perfil pode alterar ou deletar.';


-- ---------------------------------------------------------------------------
-- 19. FILA DE WEBHOOKS (idempotência e retry)
-- ---------------------------------------------------------------------------

CREATE TABLE webhook_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT NOT NULL,             -- asaas, zapsign, calcom, n8n
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  idempotency_key TEXT UNIQUE,               -- evita processamento duplicado
  status          TEXT NOT NULL DEFAULT 'pendente',  -- pendente, processado, erro
  tentativas      SMALLINT DEFAULT 0,
  erro_mensagem   TEXT,
  processado_em   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE webhook_queue IS 'Fila de webhooks recebidos para processamento idempotente e retry.';
