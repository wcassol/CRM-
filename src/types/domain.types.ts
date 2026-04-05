// =============================================================================
// CRM JURÍDICO — DOMAIN TYPES
// =============================================================================
// Tipos de domínio: versões enriquecidas das entidades do banco,
// prontas para uso nos componentes e lógica de negócio.
//
// Convenção:
//   - Db* = tipo cru do banco (database.types.ts)
//   - Domain* ou o nome direto = tipo enriquecido para uso no app
// =============================================================================

import type {
  DbUser, DbRole, DbLeadSource, DbLossReason,
  DbLead, DbPipelineHistory, DbInteraction, DbDocument, DbDocumentRequirement,
  DbAppointment, DbProposal, DbContract, DbCharge,
  DbTask, DbOnboardingChecklist, DbOnboardingItem,
  DbLeadTag, DbNotification, DbAuditLog,
  UserRole, PipelineType, EtapaComercial, EtapaOnboarding, EtapaPerdas,
} from './database.types'


// ─── User / Auth ─────────────────────────────────────────────────────────────

export interface User extends DbUser {
  role: DbRole
}

export interface AuthSession {
  userId: string
  email: string
  role: UserRole
  fullName: string
  avatarUrl: string | null
}

// ─── Lead (enriquecido com joins) ─────────────────────────────────────────────

export interface Lead extends DbLead {
  responsavel_comercial?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
  responsavel_juridico?:  Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
  source?: Pick<DbLeadSource, 'id' | 'nome' | 'canal'> | null
  loss_reason?: Pick<DbLossReason, 'id' | 'descricao'> | null
  tags?: string[]
  // contagens calculadas (agregações)
  _count?: {
    tarefas_abertas:     number
    tarefas_vencidas:    number
    documentos_pendentes: number
    interacoes:          number
  }
}

// Lead no kanban — versão leve para performance
export interface LeadCard {
  id: string
  nome: string
  telefone: string
  email: string | null
  area_juridica: string | null
  etapa_comercial: EtapaComercial
  temperatura: 'frio' | 'morno' | 'quente'
  chance_fechamento_pct: number | null
  valor_proposto: number | null
  data_proxima_acao: string | null
  responsavel_comercial_nome: string | null
  responsavel_comercial_avatar: string | null
  tarefas_vencidas: number
  documentos_pendentes: number
  urgencia: string
  prazo_sensivel: boolean
  updated_at: string
}

// Lead detalhe — versão completa com todos os relacionamentos
export interface LeadDetalhe extends Lead {
  interactions:         Interaction[]
  documents:            Document[]
  appointments:         Appointment[]
  proposals:            Proposal[]
  contracts:            Contract[]
  charges:              Charge[]
  tasks:                Task[]
  pipeline_history:     PipelineHistoryItem[]
  onboarding_checklist: OnboardingChecklist | null
  custom_fields:        CustomFieldValue[]
  tags:                 string[]
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface PipelineHistoryItem extends DbPipelineHistory {
  usuario?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
}

export interface PipelineStageConfig {
  id: EtapaComercial | EtapaOnboarding | EtapaPerdas
  label: string
  pipeline: PipelineType
  ordem: number
  cor: string        // tailwind bg color
  icone?: string     // lucide icon name
  proximo?: string   // próxima etapa padrão
  permite_retorno: boolean
}

export interface KanbanColumn {
  stage: PipelineStageConfig
  leads: LeadCard[]
  total: number
  valor_total: number
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEventType = 'interaction' | 'stage_change' | 'task_completed' | 'document' | 'appointment'

export interface TimelineEvent {
  id: string
  tipo: TimelineEventType
  subtipo: string
  descricao: string
  autor: string | null
  autor_avatar: string | null
  created_at: string
  metadata?: Record<string, unknown>
}

// ─── Interaction ──────────────────────────────────────────────────────────────

export interface Interaction extends DbInteraction {
  usuario?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document extends DbDocument {
  requirement?: Pick<DbDocumentRequirement, 'id' | 'nome' | 'instrucoes'> | null
  validado_por_user?: Pick<DbUser, 'id' | 'full_name'> | null
  download_url?: string | null   // URL assinada do Supabase Storage (expira)
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment extends DbAppointment {
  criado_por_user?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
  lead?: Pick<DbLead, 'id' | 'nome' | 'telefone'> | null
}

// ─── Proposal ─────────────────────────────────────────────────────────────────

export interface Proposal extends DbProposal {
  criado_por_user?: Pick<DbUser, 'id' | 'full_name'> | null
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface Contract extends DbContract {
  proposal?: Pick<DbProposal, 'id' | 'valor' | 'condicao_pagamento'> | null
  enviado_por_user?: Pick<DbUser, 'id' | 'full_name'> | null
}

// ─── Charge ───────────────────────────────────────────────────────────────────

export interface Charge extends DbCharge {
  contract?: Pick<DbContract, 'id' | 'status'> | null
  criado_por_user?: Pick<DbUser, 'id' | 'full_name'> | null
  // campo calculado no frontend
  status_calculado?: 'pago' | 'atrasado' | 'vence_hoje' | 'pendente' | 'cancelado' | 'estornado'
  dias_atraso?: number
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task extends DbTask {
  responsavel?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
  lead?: Pick<DbLead, 'id' | 'nome'> | null
  esta_vencida?: boolean
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export interface OnboardingChecklist extends DbOnboardingChecklist {
  items: OnboardingItem[]
  responsavel_juridico?: Pick<DbUser, 'id' | 'full_name' | 'avatar_url'> | null
  pode_enviar_astrea?: boolean
  progresso?: {
    total: number
    total_obrigatorios: number
    concluidos: number
    obrigatorios_concluidos: number
    percentual: number
  }
}

export interface OnboardingItem extends DbOnboardingItem {
  concluido_por_user?: Pick<DbUser, 'id' | 'full_name'> | null
}

// ─── Custom Fields ────────────────────────────────────────────────────────────

export interface CustomFieldValue {
  field_id: string
  nome: string
  label: string
  tipo: string
  valor: string | null
  opcoes?: string[] | null
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification extends DbNotification {}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog extends DbAuditLog {
  usuario?: Pick<DbUser, 'id' | 'full_name'> | null
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  leads_hoje:          number
  reunioes_hoje:       number
  propostas_abertas:   number
  contratos_pendentes: number
  cobracas_pendentes:  number
  tarefas_vencidas:    number
  onboardings_ativos:  number
}

export interface FunnelData {
  etapa: EtapaComercial
  label: string
  total: number
  valor_total: number
  percentual_anterior: number | null
}

export interface DashboardData {
  metrics:          DashboardMetrics
  funil:            FunnelData[]
  proximas_reunioes: Appointment[]
  tarefas_vencidas: Task[]
  leads_recentes:   LeadCard[]
  cobracas_atrasadas: Charge[]
}

// ─── Filters / Query Params ───────────────────────────────────────────────────

export interface LeadFilters {
  pipeline?:        PipelineType
  etapa?:           EtapaComercial | EtapaOnboarding | EtapaPerdas
  area_juridica?:   string
  temperatura?:     'frio' | 'morno' | 'quente'
  responsavel_id?:  string
  source_id?:       string
  viabilidade?:     'viavel' | 'inviavel' | 'pendente'
  urgencia?:        string
  tags?:            string[]
  data_inicio?:     string
  data_fim?:        string
  com_tarefa_vencida?: boolean
}

export interface PaginationParams {
  page:     number   // base 1
  per_page: number   // default 20, max 100
}

export interface SortParams {
  field:     string
  direction: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data:       T[]
  total:      number
  page:       number
  per_page:   number
  total_pages: number
}

// ─── Webhook Payloads (entradas externas) ────────────────────────────────────

export interface WebhookLeadEntrada {
  nome:       string
  telefone:   string
  email?:     string
  origem?:    string
  campanha?:  string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  area_juridica?: string
  resumo_caso?:   string
  zap_session_id?: string  // ID da conversa no ZapConnecta
  metadata?:  Record<string, unknown>
}

export interface WebhookZapSignPayload {
  token:       string         // zapsign_token do contrato
  status:      string         // 'signed' | 'refused' | 'viewed'
  signed_at?:  string
  signer_name?: string
  document_url?: string
}

export interface WebhookAsaasPayload {
  event:       string         // 'PAYMENT_CONFIRMED' | 'PAYMENT_OVERDUE' | etc
  payment: {
    id:          string        // asaas_id
    status:      string
    value:       number
    netValue?:   number
    paymentDate?: string
    dueDate:     string
    invoiceUrl?: string
  }
}

export interface WebhookCalcomPayload {
  triggerEvent:  string       // 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED'
  payload: {
    uid:          string
    title:        string
    startTime:    string
    endTime:      string
    attendees:    Array<{ email: string; name: string; phone?: string }>
    organizer:    { email: string; name: string }
    metadata?:    Record<string, unknown>
    videoCallData?: { url: string; type: string }
  }
}
