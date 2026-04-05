-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00002: ÍNDICES DE PERFORMANCE
-- =============================================================================
-- Estratégia:
--   - Índices em todas as FKs (PostgreSQL não cria automaticamente)
--   - Índices em campos de filtro frequente (etapa, status, datas, responsável)
--   - Índices compostos para queries comuns do kanban e dashboard
--   - Índice de busca textual (tsvector) para pesquisa de leads
--   - Índices parciais para soft delete (WHERE deleted_at IS NULL)
-- =============================================================================


-- ---------------------------------------------------------------------------
-- LEADS — índices principais
-- ---------------------------------------------------------------------------

-- FKs
CREATE INDEX idx_leads_source_id                ON leads(source_id);
CREATE INDEX idx_leads_responsavel_comercial    ON leads(responsavel_comercial_id);
CREATE INDEX idx_leads_responsavel_juridico     ON leads(responsavel_juridico_id);
CREATE INDEX idx_leads_loss_reason              ON leads(loss_reason_id);
CREATE INDEX idx_leads_created_by              ON leads(created_by);

-- Filtros operacionais frequentes
CREATE INDEX idx_leads_pipeline_etapa           ON leads(pipeline_atual, etapa_comercial) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_etapa_onboarding         ON leads(etapa_onboarding) WHERE etapa_onboarding IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_leads_etapa_perdas             ON leads(etapa_perdas) WHERE etapa_perdas IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_leads_temperatura              ON leads(temperatura) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_area_juridica            ON leads(area_juridica) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_data_proxima_acao        ON leads(data_proxima_acao) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at              ON leads(created_at DESC);
CREATE INDEX idx_leads_deleted_at              ON leads(deleted_at) WHERE deleted_at IS NOT NULL;

-- Unicidade lógica: alerta de duplicata (não UNIQUE, apenas indexado para consulta rápida)
CREATE INDEX idx_leads_telefone                 ON leads(telefone) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email                    ON leads(email) WHERE email IS NOT NULL AND deleted_at IS NULL;

-- Índice composto para kanban comercial (query mais frequente do sistema)
CREATE INDEX idx_leads_kanban_comercial ON leads(
  responsavel_comercial_id,
  etapa_comercial,
  created_at DESC
) WHERE pipeline_atual = 'comercial' AND deleted_at IS NULL;

-- Índice composto para dashboard executivo
CREATE INDEX idx_leads_dashboard ON leads(
  pipeline_atual,
  etapa_comercial,
  created_at DESC
) WHERE deleted_at IS NULL;

-- Busca textual full-text (nome + email + telefone + resumo_caso)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE INDEX idx_leads_search ON leads USING GIN(search_vector);

-- Função que atualiza o search_vector automaticamente
CREATE OR REPLACE FUNCTION leads_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.nome, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.telefone, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.area_juridica, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.resumo_caso, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_search_vector_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION leads_search_vector_update();


-- ---------------------------------------------------------------------------
-- PIPELINE_HISTORY — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_pipeline_history_lead         ON pipeline_history(lead_id, created_at DESC);
CREATE INDEX idx_pipeline_history_usuario       ON pipeline_history(usuario_id);
CREATE INDEX idx_pipeline_history_pipeline      ON pipeline_history(pipeline, etapa_nova);
CREATE INDEX idx_pipeline_history_created       ON pipeline_history(created_at DESC);


-- ---------------------------------------------------------------------------
-- LEAD_INTERACTIONS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_interactions_lead             ON lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_interactions_usuario          ON lead_interactions(usuario_id);
CREATE INDEX idx_interactions_tipo             ON lead_interactions(tipo);


-- ---------------------------------------------------------------------------
-- LEAD_DOCUMENTS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_documents_lead                ON lead_documents(lead_id);
CREATE INDEX idx_documents_requirement         ON lead_documents(requirement_id);
CREATE INDEX idx_documents_status              ON lead_documents(status);
CREATE INDEX idx_documents_validado_por        ON lead_documents(validado_por);


-- ---------------------------------------------------------------------------
-- APPOINTMENTS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_appointments_lead             ON appointments(lead_id);
CREATE INDEX idx_appointments_data_hora        ON appointments(data_hora) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_status           ON appointments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_cal_event        ON appointments(cal_event_id) WHERE cal_event_id IS NOT NULL;
CREATE INDEX idx_appointments_criado_por       ON appointments(criado_por);

-- Agenda do dia (query do dashboard)
CREATE INDEX idx_appointments_hoje ON appointments(data_hora)
  WHERE status IN ('agendada', 'confirmada') AND deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- PROPOSALS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_proposals_lead                ON proposals(lead_id);
CREATE INDEX idx_proposals_status              ON proposals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_proposals_criado_por          ON proposals(criado_por);
CREATE INDEX idx_proposals_enviada_em          ON proposals(enviada_em DESC);


-- ---------------------------------------------------------------------------
-- CONTRACTS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_contracts_lead                ON contracts(lead_id);
CREATE INDEX idx_contracts_proposal            ON contracts(proposal_id);
CREATE INDEX idx_contracts_zapsign_token       ON contracts(zapsign_token) WHERE zapsign_token IS NOT NULL;
CREATE INDEX idx_contracts_status              ON contracts(status);


-- ---------------------------------------------------------------------------
-- CHARGES — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_charges_lead                  ON charges(lead_id);
CREATE INDEX idx_charges_contract              ON charges(contract_id);
CREATE INDEX idx_charges_asaas_id              ON charges(asaas_id) WHERE asaas_id IS NOT NULL;
CREATE INDEX idx_charges_status                ON charges(status);
CREATE INDEX idx_charges_vencimento            ON charges(vencimento);

-- Cobranças atrasadas (query do dashboard financeiro)
CREATE INDEX idx_charges_atrasadas ON charges(vencimento)
  WHERE status = 'pendente';


-- ---------------------------------------------------------------------------
-- TASKS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tasks_lead                    ON tasks(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_tasks_responsavel             ON tasks(responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status                  ON tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_vencimento              ON tasks(vencimento) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_created_by              ON tasks(created_by);

-- Tarefas vencidas (destaque no dashboard)
CREATE INDEX idx_tasks_vencidas ON tasks(vencimento, responsavel_id)
  WHERE status IN ('aberta', 'em_andamento') AND deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- ONBOARDING — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_onboarding_lead               ON onboarding_checklists(lead_id);
CREATE INDEX idx_onboarding_responsavel        ON onboarding_checklists(responsavel_juridico_id);
CREATE INDEX idx_onboarding_status             ON onboarding_checklists(status_geral);
CREATE INDEX idx_onboarding_items_checklist    ON onboarding_items(checklist_id, ordem);
CREATE INDEX idx_onboarding_items_status       ON onboarding_items(status);


-- ---------------------------------------------------------------------------
-- AUDIT_LOGS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_audit_entity                  ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_usuario                 ON audit_logs(usuario_id, created_at DESC);
CREATE INDEX idx_audit_action                  ON audit_logs(action);
CREATE INDEX idx_audit_created                 ON audit_logs(created_at DESC);


-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_notifications_usuario         ON notifications(usuario_id, created_at DESC);
CREATE INDEX idx_notifications_nao_lidas ON notifications(usuario_id)
  WHERE lida = FALSE;
CREATE INDEX idx_notifications_entity          ON notifications(entity_type, entity_id);


-- ---------------------------------------------------------------------------
-- LEAD_TAGS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tags_lead                     ON lead_tags(lead_id);
CREATE INDEX idx_tags_tag                      ON lead_tags(tag);


-- ---------------------------------------------------------------------------
-- WEBHOOK_QUEUE — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_webhook_queue_status          ON webhook_queue(status, created_at);
CREATE INDEX idx_webhook_queue_source          ON webhook_queue(source, event_type);


-- ---------------------------------------------------------------------------
-- CUSTOM FIELDS — índices
-- ---------------------------------------------------------------------------

CREATE INDEX idx_custom_fields_lead            ON lead_custom_fields(lead_id);
CREATE INDEX idx_custom_fields_field           ON lead_custom_fields(field_id);
CREATE INDEX idx_custom_field_defs_entidade    ON custom_field_definitions(entidade, ativo);
