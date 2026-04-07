-- =============================================================================
-- CRM JURÍDICO — MIGRATION 00006: STORAGE BUCKETS + VIEWS ÚTEIS
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SUPABASE STORAGE: Buckets para documentos dos clientes
-- ---------------------------------------------------------------------------
-- NOTA: Execute via Supabase CLI ou painel. SQL puro não cria buckets.
-- Aqui documentamos a configuração esperada.
--
-- supabase storage create documentos-clientes --public=false
-- supabase storage create avatares-usuarios   --public=true
-- ---------------------------------------------------------------------------

-- Políticas de Storage (aplicar via Supabase Dashboard → Storage → Policies)
-- Bucket: documentos-clientes (PRIVADO)
--
-- SELECT (download):
--   auth.uid() IS NOT NULL AND (
--     is_admin() OR
--     EXISTS (
--       SELECT 1 FROM lead_documents ld
--       JOIN leads l ON l.id = ld.lead_id
--       WHERE ld.storage_path = name AND (
--         l.responsavel_comercial_id = auth.uid() OR
--         l.responsavel_juridico_id = auth.uid()
--       )
--     )
--   )
--
-- INSERT (upload):
--   auth.uid() IS NOT NULL
--
-- DELETE:
--   is_admin()


-- ---------------------------------------------------------------------------
-- VIEWS ÚTEIS PARA O FRONTEND E N8N
-- ---------------------------------------------------------------------------

-- View: Leads com dados principais e responsáveis (sem campos sensíveis como CPF)
CREATE OR REPLACE VIEW v_leads_resumo AS
SELECT
  l.id,
  l.nome,
  l.telefone,
  l.email,
  l.cidade,
  l.estado,
  l.area_juridica,
  l.subtipo_caso,
  l.pipeline_atual,
  l.etapa_comercial,
  l.etapa_onboarding,
  l.etapa_perdas,
  l.temperatura,
  l.viabilidade_preliminar,
  l.chance_fechamento_pct,
  l.valor_proposto,
  l.ticket_fechado,
  l.proxima_acao,
  l.data_proxima_acao,
  l.urgencia,
  l.prazo_sensivel,
  -- Responsável comercial
  uc.full_name  AS responsavel_comercial_nome,
  uc.avatar_url AS responsavel_comercial_avatar,
  -- Responsável jurídico
  uj.full_name  AS responsavel_juridico_nome,
  -- Origem
  ls.nome       AS origem_nome,
  ls.canal      AS origem_canal,
  -- Motivo de perda
  lr.descricao  AS motivo_perda,
  -- Contagens rápidas
  (SELECT COUNT(*) FROM tasks t
   WHERE t.lead_id = l.id AND t.status IN ('aberta', 'em_andamento') AND t.deleted_at IS NULL
  ) AS tarefas_abertas,
  (SELECT COUNT(*) FROM tasks t
   WHERE t.lead_id = l.id AND t.vencimento < NOW()
     AND t.status IN ('aberta', 'em_andamento') AND t.deleted_at IS NULL
  ) AS tarefas_vencidas,
  (SELECT COUNT(*) FROM lead_documents ld
   WHERE ld.lead_id = l.id AND ld.status = 'solicitado'
  ) AS documentos_pendentes,
  l.search_vector,
  l.created_at,
  l.updated_at,
  l.deleted_at
FROM leads l
LEFT JOIN users uc       ON uc.id = l.responsavel_comercial_id
LEFT JOIN users uj       ON uj.id = l.responsavel_juridico_id
LEFT JOIN lead_sources ls ON ls.id = l.source_id
LEFT JOIN loss_reasons lr ON lr.id = l.loss_reason_id
WHERE l.deleted_at IS NULL;

COMMENT ON VIEW v_leads_resumo IS 'View principal para listagem de leads. Omite CPF e dados sensíveis.';


-- View: Timeline completa do lead (interações + histórico de pipeline + tarefas concluídas)
CREATE OR REPLACE VIEW v_lead_timeline AS
SELECT
  'interaction'   AS tipo_evento,
  li.id           AS evento_id,
  li.lead_id,
  li.tipo::TEXT   AS subtipo,
  li.conteudo     AS descricao,
  u.full_name     AS autor,
  u.avatar_url    AS autor_avatar,
  li.created_at   AS evento_at
FROM lead_interactions li
LEFT JOIN users u ON u.id = li.usuario_id

UNION ALL

SELECT
  'stage_change'         AS tipo_evento,
  ph.id                  AS evento_id,
  ph.lead_id,
  ph.pipeline::TEXT      AS subtipo,
  'Etapa: ' || COALESCE(ph.etapa_anterior, 'início') || ' → ' || ph.etapa_nova AS descricao,
  u.full_name            AS autor,
  u.avatar_url           AS autor_avatar,
  ph.created_at          AS evento_at
FROM pipeline_history ph
LEFT JOIN users u ON u.id = ph.usuario_id

UNION ALL

SELECT
  'task_completed'       AS tipo_evento,
  t.id                   AS evento_id,
  t.lead_id,
  'tarefa'               AS subtipo,
  'Tarefa concluída: ' || t.titulo AS descricao,
  u.full_name            AS autor,
  u.avatar_url           AS autor_avatar,
  t.concluida_em         AS evento_at
FROM tasks t
LEFT JOIN users u ON u.id = t.concluida_por
WHERE t.status = 'concluida' AND t.lead_id IS NOT NULL AND t.concluida_em IS NOT NULL

ORDER BY evento_at DESC;

COMMENT ON VIEW v_lead_timeline IS 'Timeline unificada de interações, mudanças de etapa e tarefas concluídas.';


-- View: Tarefas com dados enriquecidos (para listagem global de tarefas)
CREATE OR REPLACE VIEW v_tasks_enriquecidas AS
SELECT
  t.id,
  t.lead_id,
  l.nome        AS lead_nome,
  l.pipeline_atual AS lead_pipeline,
  l.etapa_comercial AS lead_etapa,
  t.titulo,
  t.descricao,
  t.prioridade,
  t.status,
  t.vencimento,
  t.vencimento < NOW() AND t.status IN ('aberta', 'em_andamento') AS esta_vencida,
  t.lembrete_em,
  u.id          AS responsavel_id,
  u.full_name   AS responsavel_nome,
  u.avatar_url  AS responsavel_avatar,
  t.concluida_em,
  t.created_at,
  t.updated_at
FROM tasks t
LEFT JOIN leads l ON l.id = t.lead_id
LEFT JOIN users u ON u.id = t.responsavel_id
WHERE t.deleted_at IS NULL
ORDER BY
  CASE WHEN t.vencimento < NOW() AND t.status IN ('aberta', 'em_andamento') THEN 0 ELSE 1 END,
  t.prioridade DESC,
  t.vencimento ASC NULLS LAST;

COMMENT ON VIEW v_tasks_enriquecidas IS 'Tarefas com dados do lead e responsável. Vencidas aparecem primeiro.';


-- View: Cobranças com status enriquecido (dashboard financeiro)
CREATE OR REPLACE VIEW v_cobracas_dashboard AS
SELECT
  c.id,
  c.lead_id,
  l.nome          AS cliente_nome,
  l.telefone      AS cliente_telefone,
  c.valor,
  c.vencimento,
  c.status,
  c.pago_em,
  c.link_pagamento,
  c.asaas_id,
  CASE
    WHEN c.status = 'pago' THEN 'pago'
    WHEN c.status = 'pendente' AND c.vencimento < CURRENT_DATE THEN 'atrasado'
    WHEN c.status = 'pendente' AND c.vencimento = CURRENT_DATE THEN 'vence_hoje'
    WHEN c.status = 'pendente' THEN 'pendente'
    ELSE c.status::TEXT
  END AS status_calculado,
  CURRENT_DATE - c.vencimento AS dias_atraso,
  con.status AS contrato_status,
  c.created_at
FROM charges c
JOIN leads l ON l.id = c.lead_id
LEFT JOIN contracts con ON con.id = c.contract_id
ORDER BY
  CASE WHEN c.status = 'pendente' AND c.vencimento < CURRENT_DATE THEN 0 ELSE 1 END,
  c.vencimento ASC;

COMMENT ON VIEW v_cobracas_dashboard IS 'Cobranças com status calculado (atrasado/vence_hoje) para dashboard financeiro.';


-- View: Onboardings em andamento (visão do jurídico)
CREATE OR REPLACE VIEW v_onboardings_ativos AS
SELECT
  oc.id                 AS checklist_id,
  oc.lead_id,
  l.nome                AS cliente_nome,
  l.area_juridica,
  l.telefone,
  oc.status_geral,
  oc.data_conclusao,
  oc.referencia_astrea,
  oc.enviado_astrea_em,
  u.full_name           AS responsavel_juridico,
  u.avatar_url          AS responsavel_avatar,
  -- Progresso
  (SELECT COUNT(*) FROM onboarding_items oi
   WHERE oi.checklist_id = oc.id AND oi.obrigatorio = TRUE) AS total_obrigatorios,
  (SELECT COUNT(*) FROM onboarding_items oi
   WHERE oi.checklist_id = oc.id AND oi.obrigatorio = TRUE AND oi.status = 'concluido') AS obrigatorios_concluidos,
  -- Pode enviar ao Astrea?
  (
    SELECT COUNT(*) FROM onboarding_items oi
    WHERE oi.checklist_id = oc.id AND oi.obrigatorio = TRUE AND oi.status != 'concluido'
  ) = 0 AS pode_enviar_astrea,
  oc.created_at
FROM onboarding_checklists oc
JOIN leads l ON l.id = oc.lead_id
LEFT JOIN users u ON u.id = oc.responsavel_juridico_id
WHERE oc.enviado_astrea_em IS NULL
ORDER BY oc.created_at ASC;

COMMENT ON VIEW v_onboardings_ativos IS 'Onboardings pendentes de envio ao Astrea com progresso calculado.';


-- View: Reuniões do dia e próximas 7 dias
CREATE OR REPLACE VIEW v_proximas_reunioes AS
SELECT
  a.id,
  a.lead_id,
  l.nome          AS cliente_nome,
  l.telefone      AS cliente_telefone,
  a.titulo,
  a.data_hora,
  a.duracao_min,
  a.link_meet,
  a.status,
  a.resultado,
  u.full_name     AS criado_por_nome,
  DATE(a.data_hora) = CURRENT_DATE AS e_hoje,
  a.data_hora < NOW() AND a.status IN ('agendada', 'confirmada') AS passou_sem_resultado
FROM appointments a
JOIN leads l ON l.id = a.lead_id
LEFT JOIN users u ON u.id = a.criado_por
WHERE a.deleted_at IS NULL
  AND a.data_hora BETWEEN NOW() - INTERVAL '1 hour' AND NOW() + INTERVAL '7 days'
  AND a.status NOT IN ('cancelada', 'faltou')
ORDER BY a.data_hora ASC;

COMMENT ON VIEW v_proximas_reunioes IS 'Reuniões dos próximos 7 dias para agenda e dashboard.';


-- ---------------------------------------------------------------------------
-- HABILITAR RLS NAS VIEWS (via tabelas base — as views herdam o RLS das tabelas)
-- ---------------------------------------------------------------------------
-- Views no PostgreSQL/Supabase herdam as políticas RLS das tabelas subjacentes
-- quando o usuário não tem SECURITY DEFINER na view.
-- As views acima são SECURITY INVOKER (padrão), então o RLS das tabelas se aplica.


-- ---------------------------------------------------------------------------
-- FUNÇÃO: Busca textual de leads (para o campo de pesquisa)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_leads(
  p_query   TEXT,
  p_limit   INT DEFAULT 20,
  p_offset  INT DEFAULT 0
)
RETURNS SETOF v_leads_resumo
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM v_leads_resumo
  WHERE
    search_vector @@ plainto_tsquery('portuguese', p_query)
    OR telefone ILIKE '%' || p_query || '%'
    OR email ILIKE '%' || p_query || '%'
  ORDER BY
    ts_rank(search_vector, plainto_tsquery('portuguese', p_query)) DESC,
    updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION search_leads IS 'Busca full-text e por telefone/email. Usa índice GIN do search_vector.';
