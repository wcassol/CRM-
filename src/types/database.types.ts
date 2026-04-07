// =============================================================================
// CRM JURÍDICO — DATABASE TYPES
// =============================================================================
// Este arquivo é a base tipada do schema Supabase.
// Em produção, gerar automaticamente via:
//   supabase gen types typescript --local > src/types/database.types.ts
//
// As definições abaixo espelham exatamente o schema da ETAPA 3.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums (espelham os CREATE TYPE do banco) ────────────────────────────────

export type UserRole =
  | 'admin'
  | 'comercial'
  | 'pre_juridico'
  | 'juridico'
  | 'financeiro'

export type PipelineType =
  | 'comercial'
  | 'onboarding'
  | 'perdas'

export type EtapaComercial =
  | 'novo_lead'
  | 'triagem_iniciada'
  | 'triagem_concluida'
  | 'aguardando_documentos'
  | 'em_analise_viabilidade'
  | 'reuniao_agendada'
  | 'reuniao_realizada'
  | 'proposta_enviada'
  | 'em_negociacao'
  | 'contrato_enviado'
  | 'assinado_aguardando_pagamento'
  | 'fechado'

export type EtapaOnboarding =
  | 'pagamento_confirmado'
  | 'checklist_entrada'
  | 'documentacao_completa'
  | 'pasta_organizada'
  | 'cadastro_envio_astrea'
  | 'juridico_responsavel_definido'
  | 'cliente_ativo'

export type EtapaPerdas =
  | 'sem_viabilidade'
  | 'sem_documentos'
  | 'nao_respondeu'
  | 'nao_compareceu'
  | 'perdeu_por_preco'
  | 'fechou_com_concorrente'
  | 'reativacao_futura'

export type TemperaturaLead   = 'frio' | 'morno' | 'quente'
export type ViabilidadeTipo   = 'viavel' | 'inviavel' | 'pendente'
export type UrgenciaTipo      = 'baixa' | 'media' | 'alta' | 'critica'
export type InteractionTipo   = 'nota' | 'email' | 'whatsapp' | 'ligacao' | 'sistema' | 'reuniao' | 'tarefa'
export type DocumentStatus    = 'solicitado' | 'enviado' | 'validado' | 'recusado'
export type AppointmentStatus = 'agendada' | 'confirmada' | 'reagendada' | 'realizada' | 'faltou' | 'cancelada'
export type ProposalStatus    = 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada'
export type ContractStatus    = 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado'
export type ChargeStatus      = 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
export type TaskPrioridade    = 'baixa' | 'media' | 'alta' | 'urgente'
export type TaskStatus        = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
export type OnboardingItemStatus = 'pendente' | 'em_andamento' | 'concluido' | 'bloqueado'
export type AuditAction       = 'create' | 'update' | 'delete' | 'stage_change' | 'login' | 'logout' | 'webhook_received'


// ─── Database schema completo ────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      roles:                  { Row: DbRole;                Insert: DbRoleInsert;                Update: DbRoleUpdate;                Relationships: never[] }
      users:                  { Row: DbUser;                Insert: DbUserInsert;                Update: DbUserUpdate;                Relationships: never[] }
      lead_sources:           { Row: DbLeadSource;          Insert: DbLeadSourceInsert;          Update: DbLeadSourceUpdate;          Relationships: never[] }
      loss_reasons:           { Row: DbLossReason;          Insert: DbLossReasonInsert;          Update: DbLossReasonUpdate;          Relationships: never[] }
      document_requirements:  { Row: DbDocumentRequirement; Insert: DbDocumentRequirementInsert; Update: DbDocumentRequirementUpdate; Relationships: never[] }
      leads:                  { Row: DbLead;                Insert: DbLeadInsert;                Update: DbLeadUpdate;                Relationships: never[] }
      pipeline_history:       { Row: DbPipelineHistory;     Insert: DbPipelineHistoryInsert;     Update: never;                       Relationships: never[] }
      lead_interactions:      { Row: DbInteraction;         Insert: DbInteractionInsert;         Update: never;                       Relationships: never[] }
      lead_documents:         { Row: DbDocument;            Insert: DbDocumentInsert;            Update: DbDocumentUpdate;            Relationships: never[] }
      appointments:           { Row: DbAppointment;         Insert: DbAppointmentInsert;         Update: DbAppointmentUpdate;         Relationships: never[] }
      proposals:              { Row: DbProposal;            Insert: DbProposalInsert;            Update: DbProposalUpdate;            Relationships: never[] }
      contracts:              { Row: DbContract;            Insert: DbContractInsert;            Update: DbContractUpdate;            Relationships: never[] }
      charges:                { Row: DbCharge;              Insert: DbChargeInsert;              Update: DbChargeUpdate;              Relationships: never[] }
      tasks:                  { Row: DbTask;                Insert: DbTaskInsert;                Update: DbTaskUpdate;                Relationships: never[] }
      onboarding_checklists:  { Row: DbOnboardingChecklist; Insert: DbOnboardingChecklistInsert; Update: DbOnboardingChecklistUpdate; Relationships: never[] }
      onboarding_items:       { Row: DbOnboardingItem;      Insert: DbOnboardingItemInsert;      Update: DbOnboardingItemUpdate;      Relationships: never[] }
      lead_tags:              { Row: DbLeadTag;             Insert: DbLeadTagInsert;             Update: never;                       Relationships: never[] }
      custom_field_definitions: { Row: DbCustomFieldDef;   Insert: DbCustomFieldDefInsert;      Update: DbCustomFieldDefUpdate;      Relationships: never[] }
      lead_custom_fields:     { Row: DbLeadCustomField;     Insert: DbLeadCustomFieldInsert;     Update: DbLeadCustomFieldUpdate;     Relationships: never[] }
      integrations:           { Row: DbIntegration;         Insert: DbIntegrationInsert;         Update: DbIntegrationUpdate;         Relationships: never[] }
      notifications:          { Row: DbNotification;        Insert: DbNotificationInsert;        Update: DbNotificationUpdate;        Relationships: never[] }
      audit_logs:             { Row: DbAuditLog;            Insert: DbAuditLogInsert;            Update: never;                       Relationships: never[] }
      webhook_queue:          { Row: DbWebhookQueue;        Insert: DbWebhookQueueInsert;        Update: DbWebhookQueueUpdate;        Relationships: never[] }
    }
    Views: {
      v_leads_resumo:         { Row: DbLeadResumo }
      v_lead_timeline:        { Row: DbTimelineEvent }
      v_tasks_enriquecidas:   { Row: DbTaskEnriquecida }
      v_cobracas_dashboard:   { Row: DbCobrancaDashboard }
      v_onboardings_ativos:   { Row: DbOnboardingAtivo }
      v_proximas_reunioes:    { Row: DbProximaReuniao }
    }
    Functions: {
      get_my_role:            { Args: Record<never, never>; Returns: UserRole }
      is_admin:               { Args: Record<never, never>; Returns: boolean }
      is_my_lead:             { Args: { p_lead_id: string }; Returns: boolean }
      has_role:               { Args: { p_roles: UserRole[] }; Returns: boolean }
      get_funnel_counts:      { Args: { p_usuario_id?: string }; Returns: DbFunnelCount[] }
      get_dashboard_metrics:  { Args: { p_usuario_id?: string }; Returns: Json }
      search_leads:           { Args: { p_query: string; p_limit?: number; p_offset?: number }; Returns: DbLeadResumo[] }
    }
    Enums: {
      user_role:             UserRole
      pipeline_type:         PipelineType
      etapa_comercial:       EtapaComercial
      etapa_onboarding:      EtapaOnboarding
      etapa_perdas:          EtapaPerdas
      temperatura_lead:      TemperaturaLead
      viabilidade_tipo:      ViabilidadeTipo
      urgencia_tipo:         UrgenciaTipo
      interaction_tipo:      InteractionTipo
      document_status:       DocumentStatus
      appointment_status:    AppointmentStatus
      proposal_status:       ProposalStatus
      contract_status:       ContractStatus
      charge_status:         ChargeStatus
      task_prioridade:       TaskPrioridade
      task_status:           TaskStatus
      onboarding_item_status: OnboardingItemStatus
      audit_action:          AuditAction
    }
  }
}

// ─── Row Types (o que o banco retorna no SELECT) ──────────────────────────────

export interface DbRole {
  id: string
  name: UserRole
  display_name: string
  permissions: Json
  created_at: string
  updated_at: string
}

export interface DbUser {
  id: string
  email: string
  full_name: string
  role_id: string
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbLeadSource {
  id: string
  nome: string
  canal: string | null
  ativo: boolean
  created_at: string
}

export interface DbLossReason {
  id: string
  descricao: string
  pipeline: PipelineType
  ativo: boolean
  created_at: string
}

export interface DbDocumentRequirement {
  id: string
  nome: string
  descricao: string | null
  area_juridica: string
  obrigatorio: boolean
  instrucoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DbLead {
  id: string
  nome: string
  telefone: string
  email: string | null
  cpf: string | null
  cidade: string | null
  estado: string | null
  source_id: string | null
  campanha: string | null
  anuncio: string | null
  landing_page: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  area_juridica: string | null
  subtipo_caso: string | null
  resumo_caso: string | null
  parte_contraria: string | null
  data_fato: string | null
  urgencia: UrgenciaTipo
  prazo_sensivel: boolean
  tentou_resolver_antes: boolean
  ja_tem_advogado: boolean
  viabilidade_preliminar: ViabilidadeTipo | null
  temperatura: TemperaturaLead
  chance_fechamento_pct: number | null
  proxima_acao: string | null
  data_proxima_acao: string | null
  responsavel_comercial_id: string | null
  responsavel_juridico_id: string | null
  valor_proposto: number | null
  ticket_fechado: number | null
  objecao_principal: string | null
  loss_reason_id: string | null
  motivo_perda_obs: string | null
  pipeline_atual: PipelineType
  etapa_comercial: EtapaComercial
  etapa_onboarding: EtapaOnboarding | null
  etapa_perdas: EtapaPerdas | null
  status_onboarding: string | null
  data_envio_astrea: string | null
  referencia_astrea: string | null
  enviado_astrea_por: string | null
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbPipelineHistory {
  id: string
  lead_id: string
  pipeline: PipelineType
  etapa_anterior: string | null
  etapa_nova: string
  usuario_id: string | null
  motivo: string | null
  metadata: Json
  created_at: string
}

export interface DbInteraction {
  id: string
  lead_id: string
  tipo: InteractionTipo
  conteudo: string
  metadata: Json
  usuario_id: string | null
  created_at: string
}

export interface DbDocument {
  id: string
  lead_id: string
  requirement_id: string | null
  nome: string
  status: DocumentStatus
  storage_path: string | null
  mime_type: string | null
  tamanho_bytes: number | null
  observacao_analista: string | null
  enviado_em: string | null
  validado_em: string | null
  validado_por: string | null
  created_at: string
  updated_at: string
}

export interface DbAppointment {
  id: string
  lead_id: string
  titulo: string
  data_hora: string
  duracao_min: number
  link_meet: string | null
  cal_event_id: string | null
  status: AppointmentStatus
  resultado: string | null
  observacoes: string | null
  criado_por: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbProposal {
  id: string
  lead_id: string
  valor: number
  condicao_pagamento: string | null
  observacoes: string | null
  objecoes: string | null
  chance_fechamento_pct: number | null
  status: ProposalStatus
  enviada_em: string | null
  respondida_em: string | null
  validade_dias: number
  criado_por: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbContract {
  id: string
  lead_id: string
  proposal_id: string | null
  zapsign_token: string | null
  zapsign_doc_url: string | null
  status: ContractStatus
  link_documento: string | null
  enviado_em: string | null
  assinado_em: string | null
  enviado_por: string | null
  created_at: string
  updated_at: string
}

export interface DbCharge {
  id: string
  lead_id: string
  contract_id: string | null
  asaas_id: string | null
  valor: number
  vencimento: string
  link_pagamento: string | null
  status: ChargeStatus
  pago_em: string | null
  descricao: string | null
  criado_por: string | null
  created_at: string
  updated_at: string
}

export interface DbTask {
  id: string
  lead_id: string | null
  titulo: string
  descricao: string | null
  responsavel_id: string | null
  vencimento: string | null
  prioridade: TaskPrioridade
  status: TaskStatus
  lembrete_em: string | null
  concluida_em: string | null
  concluida_por: string | null
  created_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface DbOnboardingChecklist {
  id: string
  lead_id: string
  responsavel_juridico_id: string | null
  status_geral: OnboardingItemStatus
  data_conclusao: string | null
  referencia_astrea: string | null
  enviado_astrea_em: string | null
  enviado_por: string | null
  created_at: string
  updated_at: string
}

export interface DbOnboardingItem {
  id: string
  checklist_id: string
  titulo: string
  descricao: string | null
  obrigatorio: boolean
  ordem: number
  status: OnboardingItemStatus
  concluido_por: string | null
  concluido_em: string | null
  observacao: string | null
  created_at: string
  updated_at: string
}

export interface DbLeadTag {
  id: string
  lead_id: string
  tag: string
  created_by: string | null
  created_at: string
}

export interface DbCustomFieldDef {
  id: string
  entidade: string
  nome: string
  label: string
  tipo: string
  opcoes: Json | null
  obrigatorio: boolean
  area_juridica: string | null
  ordem: number
  ativo: boolean
  created_at: string
}

export interface DbLeadCustomField {
  id: string
  lead_id: string
  field_id: string
  valor: string | null
  created_at: string
  updated_at: string
}

export interface DbIntegration {
  id: string
  nome: string
  display_name: string
  config: Json
  webhook_secret: string | null
  ativo: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface DbNotification {
  id: string
  usuario_id: string
  tipo: string
  titulo: string
  mensagem: string | null
  entity_type: string | null
  entity_id: string | null
  lida: boolean
  lida_em: string | null
  created_at: string
}

export interface DbAuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  usuario_id: string | null
  dados_anteriores: Json | null
  dados_novos: Json | null
  ip_address: string | null
  user_agent: string | null
  metadata: Json
  created_at: string
}

export interface DbWebhookQueue {
  id: string
  source: string
  event_type: string
  payload: Json
  idempotency_key: string | null
  status: string
  tentativas: number
  erro_mensagem: string | null
  processado_em: string | null
  created_at: string
}

// ─── Insert Types (omitem id, created_at, updated_at) ────────────────────────

export type DbRoleInsert = Omit<DbRole, 'id' | 'created_at' | 'updated_at'>
export type DbRoleUpdate = Partial<DbRoleInsert>

export type DbUserInsert = Omit<DbUser, 'created_at' | 'updated_at'>
export type DbUserUpdate = Partial<Omit<DbUserInsert, 'id'>>

export type DbLeadSourceInsert = Omit<DbLeadSource, 'id' | 'created_at'>
export type DbLeadSourceUpdate = Partial<DbLeadSourceInsert>

export type DbLossReasonInsert = Omit<DbLossReason, 'id' | 'created_at'>
export type DbLossReasonUpdate = Partial<DbLossReasonInsert>

export type DbDocumentRequirementInsert = Omit<DbDocumentRequirement, 'id' | 'created_at' | 'updated_at'>
export type DbDocumentRequirementUpdate = Partial<DbDocumentRequirementInsert>

export type DbLeadInsert = Omit<DbLead, 'id' | 'created_at' | 'updated_at'>
export type DbLeadUpdate = Partial<Omit<DbLeadInsert, 'created_by'>>

export type DbPipelineHistoryInsert = Omit<DbPipelineHistory, 'id' | 'created_at'>

export type DbInteractionInsert = Omit<DbInteraction, 'id' | 'created_at'>

export type DbDocumentInsert = Omit<DbDocument, 'id' | 'created_at' | 'updated_at'>
export type DbDocumentUpdate = Partial<DbDocumentInsert>

export type DbAppointmentInsert = Omit<DbAppointment, 'id' | 'created_at' | 'updated_at'>
export type DbAppointmentUpdate = Partial<Omit<DbAppointmentInsert, 'lead_id'>>

export type DbProposalInsert = Omit<DbProposal, 'id' | 'created_at' | 'updated_at'>
export type DbProposalUpdate = Partial<Omit<DbProposalInsert, 'lead_id'>>

export type DbContractInsert = Omit<DbContract, 'id' | 'created_at' | 'updated_at'>
export type DbContractUpdate = Partial<Omit<DbContractInsert, 'lead_id'>>

export type DbChargeInsert = Omit<DbCharge, 'id' | 'created_at' | 'updated_at'>
export type DbChargeUpdate = Partial<Omit<DbChargeInsert, 'lead_id'>>

export type DbTaskInsert = Omit<DbTask, 'id' | 'created_at' | 'updated_at'>
export type DbTaskUpdate = Partial<Omit<DbTaskInsert, 'created_by'>>

export type DbOnboardingChecklistInsert = Omit<DbOnboardingChecklist, 'id' | 'created_at' | 'updated_at'>
export type DbOnboardingChecklistUpdate = Partial<Omit<DbOnboardingChecklistInsert, 'lead_id'>>

export type DbOnboardingItemInsert = Omit<DbOnboardingItem, 'id' | 'created_at' | 'updated_at'>
export type DbOnboardingItemUpdate = Partial<Omit<DbOnboardingItemInsert, 'checklist_id'>>

export type DbLeadTagInsert = Omit<DbLeadTag, 'id' | 'created_at'>

export type DbCustomFieldDefInsert = Omit<DbCustomFieldDef, 'id' | 'created_at'>
export type DbCustomFieldDefUpdate = Partial<DbCustomFieldDefInsert>

export type DbLeadCustomFieldInsert = Omit<DbLeadCustomField, 'id' | 'created_at' | 'updated_at'>
export type DbLeadCustomFieldUpdate = Partial<Omit<DbLeadCustomFieldInsert, 'lead_id' | 'field_id'>>

export type DbIntegrationInsert = Omit<DbIntegration, 'id' | 'created_at' | 'updated_at'>
export type DbIntegrationUpdate = Partial<DbIntegrationInsert>

export type DbNotificationInsert = Omit<DbNotification, 'id' | 'created_at'>
export type DbNotificationUpdate = Partial<Omit<DbNotificationInsert, 'usuario_id'>>

export type DbAuditLogInsert = Omit<DbAuditLog, 'id' | 'created_at'>

export type DbWebhookQueueInsert = Omit<DbWebhookQueue, 'id' | 'created_at'>
export type DbWebhookQueueUpdate = Partial<DbWebhookQueueInsert>

// ─── View Row Types ───────────────────────────────────────────────────────────

export interface DbLeadResumo {
  id: string
  nome: string
  telefone: string
  email: string | null
  cidade: string | null
  estado: string | null
  area_juridica: string | null
  subtipo_caso: string | null
  pipeline_atual: PipelineType
  etapa_comercial: EtapaComercial
  etapa_onboarding: EtapaOnboarding | null
  etapa_perdas: EtapaPerdas | null
  temperatura: TemperaturaLead
  viabilidade_preliminar: ViabilidadeTipo | null
  chance_fechamento_pct: number | null
  valor_proposto: number | null
  ticket_fechado: number | null
  proxima_acao: string | null
  data_proxima_acao: string | null
  urgencia: UrgenciaTipo
  prazo_sensivel: boolean
  responsavel_comercial_nome: string | null
  responsavel_comercial_avatar: string | null
  responsavel_juridico_nome: string | null
  origem_nome: string | null
  origem_canal: string | null
  motivo_perda: string | null
  tarefas_abertas: number
  tarefas_vencidas: number
  documentos_pendentes: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DbTimelineEvent {
  tipo_evento: 'interaction' | 'stage_change' | 'task_completed'
  evento_id: string
  lead_id: string
  subtipo: string
  descricao: string
  autor: string | null
  autor_avatar: string | null
  evento_at: string
}

export interface DbTaskEnriquecida {
  id: string
  lead_id: string | null
  lead_nome: string | null
  lead_pipeline: PipelineType | null
  lead_etapa: EtapaComercial | null
  titulo: string
  descricao: string | null
  prioridade: TaskPrioridade
  status: TaskStatus
  vencimento: string | null
  esta_vencida: boolean
  lembrete_em: string | null
  responsavel_id: string | null
  responsavel_nome: string | null
  responsavel_avatar: string | null
  concluida_em: string | null
  created_at: string
  updated_at: string
}

export interface DbCobrancaDashboard {
  id: string
  lead_id: string
  cliente_nome: string
  cliente_telefone: string
  valor: number
  vencimento: string
  status: ChargeStatus
  pago_em: string | null
  link_pagamento: string | null
  asaas_id: string | null
  status_calculado: 'pago' | 'atrasado' | 'vence_hoje' | 'pendente' | 'cancelado' | 'estornado'
  dias_atraso: number | null
  contrato_status: ContractStatus | null
  created_at: string
}

export interface DbOnboardingAtivo {
  checklist_id: string
  lead_id: string
  cliente_nome: string
  area_juridica: string | null
  telefone: string
  status_geral: OnboardingItemStatus
  data_conclusao: string | null
  referencia_astrea: string | null
  enviado_astrea_em: string | null
  responsavel_juridico: string | null
  responsavel_avatar: string | null
  total_obrigatorios: number
  obrigatorios_concluidos: number
  pode_enviar_astrea: boolean
  created_at: string
}

export interface DbProximaReuniao {
  id: string
  lead_id: string
  cliente_nome: string
  cliente_telefone: string
  titulo: string
  data_hora: string
  duracao_min: number
  link_meet: string | null
  status: AppointmentStatus
  resultado: string | null
  criado_por_nome: string | null
  e_hoje: boolean
  passou_sem_resultado: boolean
}

export interface DbFunnelCount {
  etapa: string
  total: number
  valor_total: number
}
