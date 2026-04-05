// =============================================================================
// CRM JURÍDICO — LEAD SCHEMAS (Zod)
// =============================================================================
// Compartilhado entre frontend (formulários) e backend (validação tRPC).
// Regra: toda mutation que chega no servidor é revalidada aqui.
// =============================================================================

import { z } from 'zod'

// ─── Enums Zod (espelham os enums do banco) ───────────────────────────────────

export const PipelineTypeZ = z.enum(['comercial', 'onboarding', 'perdas'])

export const EtapaComercialZ = z.enum([
  'novo_lead', 'triagem_iniciada', 'triagem_concluida',
  'aguardando_documentos', 'em_analise_viabilidade',
  'reuniao_agendada', 'reuniao_realizada',
  'proposta_enviada', 'em_negociacao',
  'contrato_enviado', 'assinado_aguardando_pagamento', 'fechado',
])

export const EtapaOnboardingZ = z.enum([
  'pagamento_confirmado', 'checklist_entrada', 'documentacao_completa',
  'pasta_organizada', 'cadastro_envio_astrea',
  'juridico_responsavel_definido', 'cliente_ativo',
])

export const EtapaPerdaZ = z.enum([
  'sem_viabilidade', 'sem_documentos', 'nao_respondeu',
  'nao_compareceu', 'perdeu_por_preco',
  'fechou_com_concorrente', 'reativacao_futura',
])

export const TemperaturaZ   = z.enum(['frio', 'morno', 'quente'])
export const ViabilidadeZ   = z.enum(['viavel', 'inviavel', 'pendente'])
export const UrgenciaZ      = z.enum(['baixa', 'media', 'alta', 'critica'])

// ─── Schema de criação manual de lead ────────────────────────────────────────

export const LeadCreateSchema = z.object({
  // Obrigatórios
  nome:     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  telefone: z.string()
    .min(10, 'Telefone inválido')
    .max(20)
    .transform(v => v.replace(/\D/g, '')),  // remove formatação

  // Básicos opcionais
  email:   z.string().email('E-mail inválido').optional().or(z.literal('')).transform(v => v || undefined),
  cpf:     z.string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos')
    .optional()
    .transform(v => v?.replace(/\D/g, '') || undefined),
  cidade:  z.string().max(100).optional(),
  estado:  z.string().length(2, 'Use a sigla do estado (ex: SP)').optional(),

  // Origem
  source_id:    z.string().uuid().optional(),
  campanha:     z.string().max(200).optional(),
  utm_source:   z.string().max(100).optional(),
  utm_medium:   z.string().max(100).optional(),
  utm_campaign: z.string().max(200).optional(),

  // Caso
  area_juridica:   z.string().max(50).optional(),
  subtipo_caso:    z.string().max(100).optional(),
  resumo_caso:     z.string().max(2000).optional(),
  urgencia:        UrgenciaZ.default('media'),
  prazo_sensivel:  z.boolean().default(false),

  // Responsável
  responsavel_comercial_id: z.string().uuid().optional(),
})

export type LeadCreateInput = z.infer<typeof LeadCreateSchema>

// ─── Schema de edição dos dados básicos ──────────────────────────────────────

export const LeadUpdateSchema = z.object({
  id: z.string().uuid(),

  nome:     z.string().min(2).max(200).optional(),
  telefone: z.string().min(10).max(20)
    .transform(v => v.replace(/\D/g, ''))
    .optional(),
  email:    z.string().email().optional().nullable(),
  cpf:      z.string().regex(/^\d{11}$/).optional().nullable()
    .transform(v => v?.replace(/\D/g, '') || null),
  cidade:   z.string().max(100).optional().nullable(),
  estado:   z.string().length(2).optional().nullable(),

  source_id:    z.string().uuid().optional().nullable(),
  campanha:     z.string().max(200).optional().nullable(),
  utm_source:   z.string().max(100).optional().nullable(),
  utm_medium:   z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(200).optional().nullable(),

  area_juridica:        z.string().max(50).optional().nullable(),
  subtipo_caso:         z.string().max(100).optional().nullable(),
  resumo_caso:          z.string().max(2000).optional().nullable(),
  parte_contraria:      z.string().max(200).optional().nullable(),
  data_fato:            z.string().date().optional().nullable(),
  urgencia:             UrgenciaZ.optional(),
  prazo_sensivel:       z.boolean().optional(),
  tentou_resolver_antes:z.boolean().optional(),
  ja_tem_advogado:      z.boolean().optional(),

  responsavel_comercial_id: z.string().uuid().optional().nullable(),
  responsavel_juridico_id:  z.string().uuid().optional().nullable(),

  proxima_acao:      z.string().max(500).optional().nullable(),
  data_proxima_acao: z.string().datetime().optional().nullable(),
})

export type LeadUpdateInput = z.infer<typeof LeadUpdateSchema>

// ─── Schema de qualificação / triagem ────────────────────────────────────────

export const LeadTriagemSchema = z.object({
  id: z.string().uuid(),

  area_juridica:          z.string().min(1, 'Área jurídica obrigatória'),
  subtipo_caso:           z.string().max(100).optional(),
  resumo_caso:            z.string().min(10, 'Descreva o caso brevemente').max(2000),
  parte_contraria:        z.string().max(200).optional(),
  data_fato:              z.string().date().optional().nullable(),
  urgencia:               UrgenciaZ,
  prazo_sensivel:         z.boolean(),
  tentou_resolver_antes:  z.boolean(),
  ja_tem_advogado:        z.boolean(),

  viabilidade_preliminar: ViabilidadeZ,
  temperatura:            TemperaturaZ,
  chance_fechamento_pct:  z.number().int().min(0).max(100).optional(),

  // Obrigatório se inviavel
  loss_reason_id:   z.string().uuid().optional(),
  motivo_perda_obs: z.string().max(500).optional(),
}).refine(
  data => data.viabilidade_preliminar !== 'inviavel' || !!data.loss_reason_id,
  { message: 'Motivo de perda obrigatório quando lead é marcado como inviável', path: ['loss_reason_id'] }
)

export type LeadTriagemInput = z.infer<typeof LeadTriagemSchema>

// ─── Schema de mudança de etapa (move no kanban) ──────────────────────────────

export const MoveStageSchema = z.object({
  lead_id:        z.string().uuid(),
  pipeline:       PipelineTypeZ,
  etapa_nova:     z.string().min(1),
  motivo:         z.string().max(500).optional(),
  // Obrigatório ao mover para perdas
  loss_reason_id: z.string().uuid().optional(),
  motivo_perda_obs: z.string().max(500).optional(),
}).refine(
  data => data.pipeline !== 'perdas' || !!data.loss_reason_id,
  { message: 'Motivo de perda obrigatório ao mover para pipeline de perdas', path: ['loss_reason_id'] }
)

export type MoveStageInput = z.infer<typeof MoveStageSchema>

// ─── Schema de listagem com filtros ──────────────────────────────────────────

export const LeadListSchema = z.object({
  pipeline:         PipelineTypeZ.optional(),
  etapa:            z.string().optional(),
  area_juridica:    z.string().optional(),
  temperatura:      TemperaturaZ.optional(),
  responsavel_id:   z.string().uuid().optional(),
  source_id:        z.string().uuid().optional(),
  viabilidade:      ViabilidadeZ.optional(),
  urgencia:         UrgenciaZ.optional(),
  tags:             z.array(z.string()).optional(),
  data_inicio:      z.string().date().optional(),
  data_fim:         z.string().date().optional(),
  com_tarefa_vencida: z.boolean().optional(),
  search:           z.string().max(200).optional(),
  page:             z.number().int().min(1).default(1),
  per_page:         z.number().int().min(1).max(100).default(20),
  sort_field:       z.string().optional(),
  sort_direction:   z.enum(['asc', 'desc']).default('desc'),
})

export type LeadListInput = z.infer<typeof LeadListSchema>

// ─── Schema de dados comerciais ───────────────────────────────────────────────

export const LeadComercialSchema = z.object({
  id: z.string().uuid(),
  valor_proposto:   z.number().positive().optional().nullable(),
  ticket_fechado:   z.number().positive().optional().nullable(),
  objecao_principal: z.string().max(500).optional().nullable(),
  proxima_acao:     z.string().max(500).optional().nullable(),
  data_proxima_acao: z.string().datetime().optional().nullable(),
  chance_fechamento_pct: z.number().int().min(0).max(100).optional().nullable(),
})

export type LeadComercialInput = z.infer<typeof LeadComercialSchema>

// ─── Schema de tag ────────────────────────────────────────────────────────────

export const LeadTagSchema = z.object({
  lead_id: z.string().uuid(),
  tag:     z.string().min(1).max(50).transform(v => v.toLowerCase().trim()),
})

export type LeadTagInput = z.infer<typeof LeadTagSchema>

// ─── Schema de envio ao Astrea ────────────────────────────────────────────────

export const SendToAstreaSchema = z.object({
  lead_id:           z.string().uuid(),
  referencia_astrea: z.string().min(1, 'Referência do Astrea obrigatória').max(100),
})

export type SendToAstreaInput = z.infer<typeof SendToAstreaSchema>
