-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00004: TRIGGERS, FUNÇÕES E AUTOMAÇÕES SQL
-- =============================================================================
-- Responsabilidades:
--   1. updated_at automático em todas as tabelas
--   2. Criação automática de perfil em users após auth.users signup
--   3. Validações de regras de negócio no banco
--   4. Função de detecção de duplicatas
--   5. Funções de agregação para dashboard
--   6. Notificações automáticas por trigger
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. FUNÇÃO GENÉRICA: updated_at automático
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar em todas as tabelas com updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'roles', 'lead_sources', 'loss_reasons', 'document_requirements',
    'leads', 'lead_documents', 'appointments', 'proposals', 'contracts',
    'charges', 'tasks', 'onboarding_checklists', 'onboarding_items',
    'lead_custom_fields', 'custom_field_definitions', 'integrations'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. SYNC: Criar perfil em users quando usuário é criado no Auth
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  default_role_id UUID;
BEGIN
  -- Pega o role 'comercial' como padrão (pode ser ajustado)
  SELECT id INTO default_role_id FROM roles WHERE name = 'comercial' LIMIT 1;

  INSERT INTO users (id, email, full_name, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    default_role_id
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotente

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();


-- ---------------------------------------------------------------------------
-- 3. REGRA DE NEGÓCIO: Toda mudança de etapa gera pipeline_history
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_pipeline_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Mudança na etapa comercial
  IF OLD.etapa_comercial IS DISTINCT FROM NEW.etapa_comercial THEN
    INSERT INTO pipeline_history (
      lead_id, pipeline, etapa_anterior, etapa_nova, usuario_id
    ) VALUES (
      NEW.id,
      'comercial',
      OLD.etapa_comercial::TEXT,
      NEW.etapa_comercial::TEXT,
      auth.uid()
    );
  END IF;

  -- Mudança na etapa de onboarding
  IF OLD.etapa_onboarding IS DISTINCT FROM NEW.etapa_onboarding THEN
    INSERT INTO pipeline_history (
      lead_id, pipeline, etapa_anterior, etapa_nova, usuario_id
    ) VALUES (
      NEW.id,
      'onboarding',
      OLD.etapa_onboarding::TEXT,
      NEW.etapa_onboarding::TEXT,
      auth.uid()
    );
  END IF;

  -- Mudança na etapa de perdas
  IF OLD.etapa_perdas IS DISTINCT FROM NEW.etapa_perdas THEN
    INSERT INTO pipeline_history (
      lead_id, pipeline, etapa_anterior, etapa_nova, usuario_id
    ) VALUES (
      NEW.id,
      'perdas',
      OLD.etapa_perdas::TEXT,
      NEW.etapa_perdas::TEXT,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_pipeline_history
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_pipeline_stage_change();


-- ---------------------------------------------------------------------------
-- 4. REGRA DE NEGÓCIO: Perda exige motivo (RN-03)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_loss_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se está movendo para pipeline de perdas sem motivo → bloqueia
  IF NEW.pipeline_atual = 'perdas' AND NEW.loss_reason_id IS NULL THEN
    RAISE EXCEPTION 'RN-03: Motivo de perda obrigatório ao mover lead para pipeline de perdas.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_enforce_loss_reason
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.pipeline_atual = 'perdas')
  EXECUTE FUNCTION enforce_loss_reason();


-- ---------------------------------------------------------------------------
-- 5. REGRA DE NEGÓCIO: Onboarding só inicia após pagamento (RN-05)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION enforce_onboarding_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pipeline_atual = 'onboarding' AND OLD.pipeline_atual != 'onboarding' THEN
    -- Verifica se existe cobrança paga para este lead
    IF NOT EXISTS (
      SELECT 1 FROM charges
      WHERE lead_id = NEW.id AND status = 'pago'
    ) THEN
      RAISE EXCEPTION 'RN-05: Onboarding só inicia após confirmação de pagamento.'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_enforce_onboarding_payment
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.pipeline_atual = 'onboarding' AND OLD.pipeline_atual IS DISTINCT FROM 'onboarding')
  EXECUTE FUNCTION enforce_onboarding_after_payment();


-- ---------------------------------------------------------------------------
-- 6. AUTOMAÇÃO: Criar checklist de onboarding ao mudar para pipeline onboarding
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_onboarding_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  checklist_id UUID;
BEGIN
  -- Só cria se ainda não existe
  IF NOT EXISTS (
    SELECT 1 FROM onboarding_checklists WHERE lead_id = NEW.id
  ) THEN
    INSERT INTO onboarding_checklists (lead_id, responsavel_juridico_id)
    VALUES (NEW.id, NEW.responsavel_juridico_id)
    RETURNING id INTO checklist_id;

    -- Insere itens padrão do checklist
    INSERT INTO onboarding_items (checklist_id, titulo, obrigatorio, ordem) VALUES
      (checklist_id, 'Confirmar dados cadastrais do cliente',     TRUE,  1),
      (checklist_id, 'Validar documentos pessoais',               TRUE,  2),
      (checklist_id, 'Organizar pasta digital do cliente',        TRUE,  3),
      (checklist_id, 'Confirmar área e subtipo do caso',          TRUE,  4),
      (checklist_id, 'Definir estratégia jurídica inicial',       TRUE,  5),
      (checklist_id, 'Cadastrar cliente no Astrea',               TRUE,  6),
      (checklist_id, 'Enviar boas-vindas ao cliente',             FALSE, 7);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_create_onboarding_checklist
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (NEW.pipeline_atual = 'onboarding' AND OLD.pipeline_atual IS DISTINCT FROM 'onboarding')
  EXECUTE FUNCTION create_onboarding_checklist();


-- ---------------------------------------------------------------------------
-- 7. AUTOMAÇÃO: Notificar responsável quando lead é atribuído
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_lead_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Novo responsável comercial atribuído
  IF NEW.responsavel_comercial_id IS DISTINCT FROM OLD.responsavel_comercial_id
     AND NEW.responsavel_comercial_id IS NOT NULL THEN
    INSERT INTO notifications (usuario_id, tipo, titulo, mensagem, entity_type, entity_id)
    VALUES (
      NEW.responsavel_comercial_id,
      'lead_atribuido',
      'Lead atribuído a você',
      'O lead ' || NEW.nome || ' foi atribuído a você como responsável comercial.',
      'lead',
      NEW.id
    );
  END IF;

  -- Novo responsável jurídico atribuído
  IF NEW.responsavel_juridico_id IS DISTINCT FROM OLD.responsavel_juridico_id
     AND NEW.responsavel_juridico_id IS NOT NULL THEN
    INSERT INTO notifications (usuario_id, tipo, titulo, mensagem, entity_type, entity_id)
    VALUES (
      NEW.responsavel_juridico_id,
      'lead_juridico_atribuido',
      'Caso atribuído a você',
      'O caso do cliente ' || NEW.nome || ' foi atribuído a você como responsável jurídico.',
      'lead',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_notify_assigned
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION notify_lead_assigned();


-- ---------------------------------------------------------------------------
-- 8. AUTOMAÇÃO: Notificar quando tarefa é atribuída
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_task_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.responsavel_id IS NOT NULL AND NEW.responsavel_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::UUID) THEN
    INSERT INTO notifications (usuario_id, tipo, titulo, mensagem, entity_type, entity_id)
    VALUES (
      NEW.responsavel_id,
      'tarefa_atribuida',
      'Nova tarefa: ' || NEW.titulo,
      'Uma nova tarefa foi atribuída a você com vencimento em ' ||
        COALESCE(TO_CHAR(NEW.vencimento, 'DD/MM/YYYY'), 'sem data definida'),
      'task',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_notify_assigned
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_assigned();


-- ---------------------------------------------------------------------------
-- 9. AUTOMAÇÃO: Atualizar status_geral do checklist de onboarding
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_onboarding_checklist_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  total_obrigatorios  INT;
  total_concluidos    INT;
  total_items         INT;
  novo_status         onboarding_item_status;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE obrigatorio = TRUE),
    COUNT(*) FILTER (WHERE obrigatorio = TRUE AND status = 'concluido'),
    COUNT(*)
  INTO total_obrigatorios, total_concluidos, total_items
  FROM onboarding_items
  WHERE checklist_id = NEW.checklist_id;

  IF total_concluidos = 0 THEN
    novo_status := 'pendente';
  ELSIF total_concluidos < total_obrigatorios THEN
    novo_status := 'em_andamento';
  ELSE
    novo_status := 'concluido';
  END IF;

  UPDATE onboarding_checklists
  SET
    status_geral = novo_status,
    data_conclusao = CASE WHEN novo_status = 'concluido' THEN NOW() ELSE NULL END
  WHERE id = NEW.checklist_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER onboarding_items_update_checklist
  AFTER INSERT OR UPDATE ON onboarding_items
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_checklist_status();


-- ---------------------------------------------------------------------------
-- 10. FUNÇÃO: Detectar leads duplicados por telefone ou CPF
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION find_duplicate_leads(
  p_telefone TEXT,
  p_cpf      TEXT DEFAULT NULL
)
RETURNS TABLE (
  id        UUID,
  nome      TEXT,
  telefone  TEXT,
  email     TEXT,
  etapa     TEXT,
  pipeline  pipeline_type
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    l.id,
    l.nome,
    l.telefone,
    l.email,
    l.etapa_comercial::TEXT AS etapa,
    l.pipeline_atual AS pipeline
  FROM leads l
  WHERE l.deleted_at IS NULL
    AND (
      l.telefone = p_telefone
      OR (p_cpf IS NOT NULL AND l.cpf = p_cpf)
    )
  ORDER BY l.created_at DESC
  LIMIT 10;
$$;


-- ---------------------------------------------------------------------------
-- 11. FUNÇÕES DE DASHBOARD (agregações otimizadas)
-- ---------------------------------------------------------------------------

-- Contagem de leads por etapa comercial (para o kanban e funil)
CREATE OR REPLACE FUNCTION get_funnel_counts(
  p_usuario_id UUID DEFAULT NULL
)
RETURNS TABLE (
  etapa     TEXT,
  total     BIGINT,
  valor_total NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    etapa_comercial::TEXT AS etapa,
    COUNT(*) AS total,
    COALESCE(SUM(valor_proposto), 0) AS valor_total
  FROM leads
  WHERE pipeline_atual = 'comercial'
    AND deleted_at IS NULL
    AND (
      p_usuario_id IS NULL OR
      responsavel_comercial_id = p_usuario_id OR
      is_admin()
    )
  GROUP BY etapa_comercial
  ORDER BY etapa_comercial;
$$;

-- Métricas gerais do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'leads_hoje',          (
      SELECT COUNT(*) FROM leads
      WHERE DATE(created_at) = CURRENT_DATE AND deleted_at IS NULL
        AND (p_usuario_id IS NULL OR responsavel_comercial_id = p_usuario_id)
    ),
    'reunioes_hoje',       (
      SELECT COUNT(*) FROM appointments
      WHERE DATE(data_hora) = CURRENT_DATE
        AND status IN ('agendada', 'confirmada')
        AND deleted_at IS NULL
    ),
    'propostas_abertas',   (
      SELECT COUNT(*) FROM proposals p
      JOIN leads l ON l.id = p.lead_id
      WHERE p.status = 'enviada' AND p.deleted_at IS NULL AND l.deleted_at IS NULL
        AND (p_usuario_id IS NULL OR l.responsavel_comercial_id = p_usuario_id)
    ),
    'contratos_pendentes', (
      SELECT COUNT(*) FROM contracts c
      JOIN leads l ON l.id = c.lead_id
      WHERE c.status IN ('enviado') AND l.deleted_at IS NULL
    ),
    'cobracas_pendentes',  (
      SELECT COUNT(*) FROM charges
      WHERE status = 'pendente'
    ),
    'tarefas_vencidas',    (
      SELECT COUNT(*) FROM tasks
      WHERE status IN ('aberta', 'em_andamento')
        AND vencimento < NOW()
        AND deleted_at IS NULL
        AND (p_usuario_id IS NULL OR responsavel_id = p_usuario_id)
    ),
    'onboardings_ativos',  (
      SELECT COUNT(*) FROM onboarding_checklists
      WHERE status_geral IN ('pendente', 'em_andamento')
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Taxa de conversão por etapa (relatórios)
CREATE OR REPLACE FUNCTION get_conversion_rate(
  p_data_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_data_fim    DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  etapa_anterior  TEXT,
  etapa_nova      TEXT,
  total           BIGINT,
  percentual      NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH totais AS (
    SELECT etapa_anterior, COUNT(*) AS total_etapa
    FROM pipeline_history
    WHERE pipeline = 'comercial'
      AND created_at BETWEEN p_data_inicio AND p_data_fim + INTERVAL '1 day'
    GROUP BY etapa_anterior
  )
  SELECT
    ph.etapa_anterior,
    ph.etapa_nova,
    COUNT(*) AS total,
    ROUND(COUNT(*) * 100.0 / NULLIF(t.total_etapa, 0), 1) AS percentual
  FROM pipeline_history ph
  LEFT JOIN totais t ON t.etapa_anterior = ph.etapa_anterior
  WHERE ph.pipeline = 'comercial'
    AND ph.created_at BETWEEN p_data_inicio AND p_data_fim + INTERVAL '1 day'
  GROUP BY ph.etapa_anterior, ph.etapa_nova, t.total_etapa
  ORDER BY ph.etapa_anterior, total DESC;
$$;


-- ---------------------------------------------------------------------------
-- 12. FUNÇÃO: Audit log automático para tabelas críticas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_lead_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    usuario_id,
    dados_anteriores,
    dados_novos
  ) VALUES (
    'lead',
    COALESCE(NEW.id, OLD.id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END::audit_action,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_lead_changes();

-- Audit em contratos
CREATE OR REPLACE FUNCTION audit_generic_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, action, usuario_id, dados_anteriores, dados_novos)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id),
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END::audit_action,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar audit nas tabelas sensíveis
CREATE TRIGGER contracts_audit
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW EXECUTE FUNCTION audit_generic_changes();

CREATE TRIGGER charges_audit
  AFTER INSERT OR UPDATE OR DELETE ON charges
  FOR EACH ROW EXECUTE FUNCTION audit_generic_changes();

CREATE TRIGGER onboarding_checklists_audit
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION audit_generic_changes();
