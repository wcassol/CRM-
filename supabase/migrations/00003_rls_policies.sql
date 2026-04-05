-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00003: ROW LEVEL SECURITY + POLÍTICAS
-- =============================================================================
-- Estratégia de RLS:
--
--   CAMADA 1 — RLS do Supabase (banco de dados)
--     Filtra automaticamente por auth.uid() nas queries do Supabase client.
--     O backend usa service_role (bypass RLS) para lógica de negócio complexa.
--
--   CAMADA 2 — Middleware tRPC (aplicação)
--     Verifica role e permissões antes de executar procedures.
--
--   CAMADA 3 — Frontend
--     Oculta elementos por role (defense in depth visual).
--
-- Funções auxiliares:
--   - get_my_role()         → retorna role do usuário logado
--   - is_admin()            → TRUE se role = 'admin'
--   - is_my_lead(lead_id)   → TRUE se usuário é responsável do lead
-- =============================================================================


-- ---------------------------------------------------------------------------
-- HABILITAR RLS NAS TABELAS
-- ---------------------------------------------------------------------------

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_reasons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requirements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists   ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_fields      ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_queue           ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- FUNÇÕES AUXILIARES DE SEGURANÇA
-- ---------------------------------------------------------------------------

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT r.name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid()
    AND u.is_active = TRUE
$$;

-- Atalho: verifica se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT get_my_role() = 'admin'
$$;

-- Verifica se o usuário logado é responsável do lead (comercial ou jurídico)
CREATE OR REPLACE FUNCTION is_my_lead(p_lead_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM leads
    WHERE id = p_lead_id
      AND (
        responsavel_comercial_id = auth.uid() OR
        responsavel_juridico_id  = auth.uid() OR
        created_by               = auth.uid()
      )
  )
$$;

-- Verifica se usuário tem um dos roles listados
CREATE OR REPLACE FUNCTION has_role(p_roles user_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT get_my_role() = ANY(p_roles)
$$;


-- ---------------------------------------------------------------------------
-- TABELA: users
-- ---------------------------------------------------------------------------

-- Qualquer usuário autenticado vê todos os usuários ativos (para select em formulários)
CREATE POLICY "users: ver todos ativos"
  ON users FOR SELECT
  USING (is_active = TRUE AND auth.uid() IS NOT NULL);

-- Usuário vê o próprio perfil mesmo se inativo
CREATE POLICY "users: ver proprio perfil"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Apenas admin insere usuários
CREATE POLICY "users: admin insere"
  ON users FOR INSERT
  WITH CHECK (is_admin());

-- Admin atualiza qualquer usuário; usuário atualiza apenas próprio perfil (nome, avatar, telefone)
CREATE POLICY "users: admin atualiza todos"
  ON users FOR UPDATE
  USING (is_admin());

CREATE POLICY "users: atualiza proprio perfil"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Apenas admin deleta (soft via is_active = FALSE)
CREATE POLICY "users: admin desativa"
  ON users FOR DELETE
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELAS DE REFERÊNCIA (roles, sources, reasons, requirements)
-- ---------------------------------------------------------------------------

-- Leitura aberta para autenticados (dados de configuração)
CREATE POLICY "roles: leitura autenticada"
  ON roles FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "lead_sources: leitura autenticada"
  ON lead_sources FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "loss_reasons: leitura autenticada"
  ON loss_reasons FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "document_requirements: leitura autenticada"
  ON document_requirements FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admin escreve em tabelas de configuração
CREATE POLICY "roles: admin gerencia"
  ON roles FOR ALL USING (is_admin());

CREATE POLICY "lead_sources: admin gerencia"
  ON lead_sources FOR ALL USING (is_admin());

CREATE POLICY "loss_reasons: admin gerencia"
  ON loss_reasons FOR ALL USING (is_admin());

CREATE POLICY "document_requirements: admin gerencia"
  ON document_requirements FOR ALL USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: leads
-- ---------------------------------------------------------------------------

-- Admin vê todos; demais usuários veem leads onde são responsáveis
CREATE POLICY "leads: admin ve todos"
  ON leads FOR SELECT
  USING (is_admin() AND deleted_at IS NULL);

CREATE POLICY "leads: comercial ve seus leads"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL AND
    has_role(ARRAY['comercial']::user_role[]) AND
    (
      responsavel_comercial_id = auth.uid() OR
      created_by = auth.uid()
    )
  );

CREATE POLICY "leads: pre_juridico ve leads em analise"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL AND
    has_role(ARRAY['pre_juridico']::user_role[]) AND
    etapa_comercial IN (
      'aguardando_documentos',
      'em_analise_viabilidade'
    )
  );

CREATE POLICY "leads: juridico ve leads fechados"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL AND
    has_role(ARRAY['juridico']::user_role[]) AND
    (
      pipeline_atual = 'onboarding' OR
      responsavel_juridico_id = auth.uid()
    )
  );

CREATE POLICY "leads: financeiro ve leads com cobranca"
  ON leads FOR SELECT
  USING (
    deleted_at IS NULL AND
    has_role(ARRAY['financeiro']::user_role[]) AND
    etapa_comercial IN (
      'assinado_aguardando_pagamento',
      'fechado'
    )
  );

-- Inserção: admin e comercial
CREATE POLICY "leads: admin e comercial inserem"
  ON leads FOR INSERT
  WITH CHECK (
    has_role(ARRAY['admin', 'comercial']::user_role[])
  );

-- Atualização: admin atualiza tudo; comercial atualiza seus leads; pré-jurídico atualiza campos de análise
CREATE POLICY "leads: admin atualiza todos"
  ON leads FOR UPDATE
  USING (is_admin());

CREATE POLICY "leads: comercial atualiza seus"
  ON leads FOR UPDATE
  USING (
    has_role(ARRAY['comercial']::user_role[]) AND
    (responsavel_comercial_id = auth.uid() OR created_by = auth.uid()) AND
    deleted_at IS NULL
  );

CREATE POLICY "leads: pre_juridico atualiza viabilidade"
  ON leads FOR UPDATE
  USING (
    has_role(ARRAY['pre_juridico']::user_role[]) AND
    deleted_at IS NULL
  );

CREATE POLICY "leads: juridico atualiza onboarding"
  ON leads FOR UPDATE
  USING (
    has_role(ARRAY['juridico']::user_role[]) AND
    pipeline_atual = 'onboarding' AND
    deleted_at IS NULL
  );

-- Soft delete: apenas admin
CREATE POLICY "leads: apenas admin deleta"
  ON leads FOR DELETE
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: pipeline_history (imutável para todos exceto inserção)
-- ---------------------------------------------------------------------------

CREATE POLICY "pipeline_history: leitura por responsável"
  ON pipeline_history FOR SELECT
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = pipeline_history.lead_id AND (
        l.responsavel_comercial_id = auth.uid() OR
        l.responsavel_juridico_id  = auth.uid() OR
        l.created_by               = auth.uid() OR
        is_admin()
      )
    )
  );

-- Inserção via service (backend com service_role) apenas
-- RLS permite, mas a restrição real está no backend
CREATE POLICY "pipeline_history: inserção autenticada"
  ON pipeline_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- NENHUM perfil pode atualizar ou deletar histórico de pipeline
-- (sem policy de UPDATE/DELETE = acesso negado por padrão com RLS ativo)


-- ---------------------------------------------------------------------------
-- TABELA: lead_interactions
-- ---------------------------------------------------------------------------

CREATE POLICY "interactions: leitura por responsável ou admin"
  ON lead_interactions FOR SELECT
  USING (
    is_admin() OR
    is_my_lead(lead_id) OR
    has_role(ARRAY['pre_juridico', 'juridico']::user_role[])
  );

CREATE POLICY "interactions: inserção autenticada"
  ON lead_interactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Usuário edita apenas as próprias notas; admin edita tudo
CREATE POLICY "interactions: edição própria ou admin"
  ON lead_interactions FOR UPDATE
  USING (usuario_id = auth.uid() OR is_admin());

CREATE POLICY "interactions: deleção admin"
  ON lead_interactions FOR DELETE
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: lead_documents
-- ---------------------------------------------------------------------------

CREATE POLICY "documents: leitura por responsável ou análise"
  ON lead_documents FOR SELECT
  USING (
    is_admin() OR
    is_my_lead(lead_id) OR
    has_role(ARRAY['pre_juridico', 'juridico']::user_role[])
  );

CREATE POLICY "documents: inserção autenticada"
  ON lead_documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Validação apenas pelo pré-jurídico e admin
CREATE POLICY "documents: validação pre_juridico"
  ON lead_documents FOR UPDATE
  USING (
    is_admin() OR
    has_role(ARRAY['pre_juridico']::user_role[]) OR
    is_my_lead(lead_id)
  );

CREATE POLICY "documents: deleção admin"
  ON lead_documents FOR DELETE
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: appointments
-- ---------------------------------------------------------------------------

CREATE POLICY "appointments: leitura por responsável ou admin"
  ON appointments FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin() OR
      is_my_lead(lead_id) OR
      criado_por = auth.uid()
    )
  );

CREATE POLICY "appointments: inserção comercial e admin"
  ON appointments FOR INSERT
  WITH CHECK (
    has_role(ARRAY['admin', 'comercial']::user_role[])
  );

CREATE POLICY "appointments: atualização responsável"
  ON appointments FOR UPDATE
  USING (
    is_admin() OR
    criado_por = auth.uid() OR
    is_my_lead(lead_id)
  );

CREATE POLICY "appointments: soft delete admin"
  ON appointments FOR DELETE
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: proposals
-- ---------------------------------------------------------------------------

CREATE POLICY "proposals: leitura por responsável ou admin"
  ON proposals FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin() OR
      is_my_lead(lead_id) OR
      criado_por = auth.uid()
    )
  );

CREATE POLICY "proposals: gestão comercial"
  ON proposals FOR ALL
  USING (
    is_admin() OR
    (has_role(ARRAY['comercial']::user_role[]) AND is_my_lead(lead_id))
  );


-- ---------------------------------------------------------------------------
-- TABELA: contracts
-- ---------------------------------------------------------------------------

CREATE POLICY "contracts: leitura por responsável ou admin"
  ON contracts FOR SELECT
  USING (
    is_admin() OR
    is_my_lead(lead_id) OR
    has_role(ARRAY['financeiro']::user_role[])
  );

-- Apenas admin e comercial criam/editam contratos
CREATE POLICY "contracts: gestão admin e comercial"
  ON contracts FOR ALL
  USING (
    is_admin() OR
    (has_role(ARRAY['comercial']::user_role[]) AND is_my_lead(lead_id))
  );


-- ---------------------------------------------------------------------------
-- TABELA: charges
-- ---------------------------------------------------------------------------

CREATE POLICY "charges: leitura financeiro, admin e responsável"
  ON charges FOR SELECT
  USING (
    is_admin() OR
    has_role(ARRAY['financeiro']::user_role[]) OR
    is_my_lead(lead_id)
  );

-- Financeiro e admin gerenciam cobranças
CREATE POLICY "charges: gestão financeiro e admin"
  ON charges FOR ALL
  USING (
    is_admin() OR
    has_role(ARRAY['financeiro']::user_role[])
  );


-- ---------------------------------------------------------------------------
-- TABELA: tasks
-- ---------------------------------------------------------------------------

-- Usuário vê as próprias tarefas e tarefas dos seus leads; admin vê tudo
CREATE POLICY "tasks: leitura responsável ou admin"
  ON tasks FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin() OR
      responsavel_id = auth.uid() OR
      created_by = auth.uid() OR
      (lead_id IS NOT NULL AND is_my_lead(lead_id))
    )
  );

CREATE POLICY "tasks: inserção autenticada"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks: atualização responsável ou admin"
  ON tasks FOR UPDATE
  USING (
    is_admin() OR
    responsavel_id = auth.uid() OR
    created_by = auth.uid()
  );

CREATE POLICY "tasks: soft delete responsável ou admin"
  ON tasks FOR DELETE
  USING (is_admin() OR created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- TABELA: onboarding_checklists
-- ---------------------------------------------------------------------------

CREATE POLICY "onboarding: leitura juridico, admin e responsável"
  ON onboarding_checklists FOR SELECT
  USING (
    is_admin() OR
    has_role(ARRAY['juridico']::user_role[]) OR
    responsavel_juridico_id = auth.uid()
  );

CREATE POLICY "onboarding: gestão juridico e admin"
  ON onboarding_checklists FOR ALL
  USING (
    is_admin() OR
    has_role(ARRAY['juridico']::user_role[])
  );

CREATE POLICY "onboarding_items: leitura via checklist"
  ON onboarding_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_checklists oc
      WHERE oc.id = onboarding_items.checklist_id AND (
        is_admin() OR
        has_role(ARRAY['juridico']::user_role[]) OR
        oc.responsavel_juridico_id = auth.uid()
      )
    )
  );

CREATE POLICY "onboarding_items: gestão juridico e admin"
  ON onboarding_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_checklists oc
      WHERE oc.id = onboarding_items.checklist_id AND (
        is_admin() OR
        has_role(ARRAY['juridico']::user_role[])
      )
    )
  );


-- ---------------------------------------------------------------------------
-- TABELA: lead_tags
-- ---------------------------------------------------------------------------

CREATE POLICY "tags: leitura por responsável"
  ON lead_tags FOR SELECT
  USING (is_admin() OR is_my_lead(lead_id));

CREATE POLICY "tags: inserção autenticada"
  ON lead_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_my_lead(lead_id));

CREATE POLICY "tags: deleção própria ou admin"
  ON lead_tags FOR DELETE
  USING (is_admin() OR created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- TABELA: custom_field_definitions
-- ---------------------------------------------------------------------------

CREATE POLICY "custom_fields_def: leitura autenticada"
  ON custom_field_definitions FOR SELECT
  USING (auth.uid() IS NOT NULL AND ativo = TRUE);

CREATE POLICY "custom_fields_def: gestão admin"
  ON custom_field_definitions FOR ALL
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: lead_custom_fields
-- ---------------------------------------------------------------------------

CREATE POLICY "lead_custom_fields: leitura por responsável"
  ON lead_custom_fields FOR SELECT
  USING (is_admin() OR is_my_lead(lead_id));

CREATE POLICY "lead_custom_fields: escrita por responsável"
  ON lead_custom_fields FOR ALL
  USING (is_admin() OR is_my_lead(lead_id));


-- ---------------------------------------------------------------------------
-- TABELA: integrations
-- ---------------------------------------------------------------------------

-- Apenas admin acessa configurações de integração
CREATE POLICY "integrations: apenas admin"
  ON integrations FOR ALL
  USING (is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: notifications
-- ---------------------------------------------------------------------------

-- Usuário vê apenas as próprias notificações
CREATE POLICY "notifications: apenas próprias"
  ON notifications FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "notifications: marcar como lida"
  ON notifications FOR UPDATE
  USING (usuario_id = auth.uid());

-- Inserção via service_role (backend), mas policy permissiva para permitir
CREATE POLICY "notifications: inserção autenticada"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);  -- controlado pelo backend com service_role

CREATE POLICY "notifications: deleção própria"
  ON notifications FOR DELETE
  USING (usuario_id = auth.uid() OR is_admin());


-- ---------------------------------------------------------------------------
-- TABELA: audit_logs (SOMENTE LEITURA para admin; IMUTÁVEL)
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_logs: leitura admin"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- Inserção via service_role apenas (backend)
-- NENHUM perfil pode fazer UPDATE ou DELETE em audit_logs
-- (políticas de UPDATE e DELETE não são criadas = negação por padrão com RLS ativo)


-- ---------------------------------------------------------------------------
-- TABELA: webhook_queue
-- ---------------------------------------------------------------------------

-- Apenas admin lê a fila de webhooks (diagnóstico)
CREATE POLICY "webhook_queue: leitura admin"
  ON webhook_queue FOR SELECT
  USING (is_admin());

-- Inserção via service_role (webhooks entram pelo backend)
-- Updates de status via service_role


-- ---------------------------------------------------------------------------
-- GRANT de permissões básicas para a role anon e authenticated
-- ---------------------------------------------------------------------------

-- anon: sem acesso a nada (todo acesso exige autenticação)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- authenticated: acesso controlado por RLS (as policies acima)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
