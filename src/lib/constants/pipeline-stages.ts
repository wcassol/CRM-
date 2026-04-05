// =============================================================================
// CRM JURÍDICO — PIPELINE STAGES CONSTANTS
// Configuração visual e comportamental de cada etapa
// =============================================================================

import type { EtapaComercial, EtapaOnboarding, EtapaPerdas } from '@/types/database.types'

export interface StageConfig {
  id:              string
  label:           string
  descricao:       string
  cor:             string   // tailwind bg-* class
  corTexto:        string   // tailwind text-* class
  corBorda:        string   // tailwind border-* class
  icone:           string   // lucide icon name
  permite_retorno: boolean
  etapa_seguinte?: string
}

// ─── Pipeline Comercial ───────────────────────────────────────────────────────

export const ETAPAS_COMERCIAL: Record<EtapaComercial, StageConfig> = {
  novo_lead: {
    id: 'novo_lead', label: 'Novo Lead', descricao: 'Lead recém captado, aguardando triagem',
    cor: 'bg-slate-100', corTexto: 'text-slate-700', corBorda: 'border-slate-300',
    icone: 'UserPlus', permite_retorno: false, etapa_seguinte: 'triagem_iniciada',
  },
  triagem_iniciada: {
    id: 'triagem_iniciada', label: 'Triagem Iniciada', descricao: 'Triagem em andamento',
    cor: 'bg-blue-100', corTexto: 'text-blue-700', corBorda: 'border-blue-300',
    icone: 'ClipboardList', permite_retorno: true, etapa_seguinte: 'triagem_concluida',
  },
  triagem_concluida: {
    id: 'triagem_concluida', label: 'Triagem Concluída', descricao: 'Caso triado e qualificado',
    cor: 'bg-blue-200', corTexto: 'text-blue-800', corBorda: 'border-blue-400',
    icone: 'ClipboardCheck', permite_retorno: true, etapa_seguinte: 'aguardando_documentos',
  },
  aguardando_documentos: {
    id: 'aguardando_documentos', label: 'Aguardando Docs', descricao: 'Solicitação de documentos enviada',
    cor: 'bg-amber-100', corTexto: 'text-amber-700', corBorda: 'border-amber-300',
    icone: 'FileSearch', permite_retorno: true, etapa_seguinte: 'em_analise_viabilidade',
  },
  em_analise_viabilidade: {
    id: 'em_analise_viabilidade', label: 'Em Análise', descricao: 'Documentos recebidos, em análise de viabilidade',
    cor: 'bg-purple-100', corTexto: 'text-purple-700', corBorda: 'border-purple-300',
    icone: 'Search', permite_retorno: true, etapa_seguinte: 'reuniao_agendada',
  },
  reuniao_agendada: {
    id: 'reuniao_agendada', label: 'Reunião Agendada', descricao: 'Reunião de consultoria agendada',
    cor: 'bg-indigo-100', corTexto: 'text-indigo-700', corBorda: 'border-indigo-300',
    icone: 'Calendar', permite_retorno: true, etapa_seguinte: 'reuniao_realizada',
  },
  reuniao_realizada: {
    id: 'reuniao_realizada', label: 'Reunião Realizada', descricao: 'Reunião concluída com sucesso',
    cor: 'bg-indigo-200', corTexto: 'text-indigo-800', corBorda: 'border-indigo-400',
    icone: 'CalendarCheck', permite_retorno: true, etapa_seguinte: 'proposta_enviada',
  },
  proposta_enviada: {
    id: 'proposta_enviada', label: 'Proposta Enviada', descricao: 'Proposta comercial enviada ao cliente',
    cor: 'bg-orange-100', corTexto: 'text-orange-700', corBorda: 'border-orange-300',
    icone: 'Send', permite_retorno: true, etapa_seguinte: 'em_negociacao',
  },
  em_negociacao: {
    id: 'em_negociacao', label: 'Em Negociação', descricao: 'Negociando condições com o cliente',
    cor: 'bg-orange-200', corTexto: 'text-orange-800', corBorda: 'border-orange-400',
    icone: 'Handshake', permite_retorno: true, etapa_seguinte: 'contrato_enviado',
  },
  contrato_enviado: {
    id: 'contrato_enviado', label: 'Contrato Enviado', descricao: 'Contrato enviado via ZapSign',
    cor: 'bg-teal-100', corTexto: 'text-teal-700', corBorda: 'border-teal-300',
    icone: 'FileSignature', permite_retorno: false, etapa_seguinte: 'assinado_aguardando_pagamento',
  },
  assinado_aguardando_pagamento: {
    id: 'assinado_aguardando_pagamento', label: 'Assinado / Aguard. Pgto',
    descricao: 'Contrato assinado, aguardando confirmação de pagamento',
    cor: 'bg-teal-200', corTexto: 'text-teal-800', corBorda: 'border-teal-400',
    icone: 'CreditCard', permite_retorno: false, etapa_seguinte: 'fechado',
  },
  fechado: {
    id: 'fechado', label: 'Fechado', descricao: 'Pagamento confirmado. Cliente ativo.',
    cor: 'bg-green-100', corTexto: 'text-green-700', corBorda: 'border-green-400',
    icone: 'CheckCircle', permite_retorno: false,
  },
}

// ─── Pipeline Onboarding ──────────────────────────────────────────────────────

export const ETAPAS_ONBOARDING: Record<EtapaOnboarding, StageConfig> = {
  pagamento_confirmado: {
    id: 'pagamento_confirmado', label: 'Pgto Confirmado', descricao: 'Pagamento confirmado no Asaas',
    cor: 'bg-green-50', corTexto: 'text-green-700', corBorda: 'border-green-300',
    icone: 'CheckCircle2', permite_retorno: false, etapa_seguinte: 'checklist_entrada',
  },
  checklist_entrada: {
    id: 'checklist_entrada', label: 'Checklist de Entrada', descricao: 'Checklist de onboarding criado',
    cor: 'bg-sky-100', corTexto: 'text-sky-700', corBorda: 'border-sky-300',
    icone: 'ListChecks', permite_retorno: false, etapa_seguinte: 'documentacao_completa',
  },
  documentacao_completa: {
    id: 'documentacao_completa', label: 'Docs Completa', descricao: 'Documentação do cliente validada',
    cor: 'bg-sky-200', corTexto: 'text-sky-800', corBorda: 'border-sky-400',
    icone: 'FolderCheck', permite_retorno: true, etapa_seguinte: 'pasta_organizada',
  },
  pasta_organizada: {
    id: 'pasta_organizada', label: 'Pasta Organizada', descricao: 'Pasta digital do cliente organizada',
    cor: 'bg-violet-100', corTexto: 'text-violet-700', corBorda: 'border-violet-300',
    icone: 'FolderOpen', permite_retorno: true, etapa_seguinte: 'cadastro_envio_astrea',
  },
  cadastro_envio_astrea: {
    id: 'cadastro_envio_astrea', label: 'Cadastro p/ Astrea', descricao: 'Preparando dados para o Astrea',
    cor: 'bg-violet-200', corTexto: 'text-violet-800', corBorda: 'border-violet-400',
    icone: 'Database', permite_retorno: true, etapa_seguinte: 'juridico_responsavel_definido',
  },
  juridico_responsavel_definido: {
    id: 'juridico_responsavel_definido', label: 'Jurídico Definido', descricao: 'Advogado responsável definido',
    cor: 'bg-fuchsia-100', corTexto: 'text-fuchsia-700', corBorda: 'border-fuchsia-300',
    icone: 'UserCheck', permite_retorno: true, etapa_seguinte: 'cliente_ativo',
  },
  cliente_ativo: {
    id: 'cliente_ativo', label: 'Cliente Ativo', descricao: 'Caso no Astrea. Cliente ativo na operação.',
    cor: 'bg-emerald-100', corTexto: 'text-emerald-700', corBorda: 'border-emerald-400',
    icone: 'Star', permite_retorno: false,
  },
}

// ─── Pipeline Perdas ──────────────────────────────────────────────────────────

export const ETAPAS_PERDAS: Record<EtapaPerdas, StageConfig> = {
  sem_viabilidade: {
    id: 'sem_viabilidade', label: 'Sem Viabilidade', descricao: 'Caso sem viabilidade jurídica',
    cor: 'bg-red-100', corTexto: 'text-red-700', corBorda: 'border-red-300',
    icone: 'XCircle', permite_retorno: false,
  },
  sem_documentos: {
    id: 'sem_documentos', label: 'Sem Documentos', descricao: 'Lead não enviou documentação',
    cor: 'bg-red-100', corTexto: 'text-red-700', corBorda: 'border-red-300',
    icone: 'FileX', permite_retorno: false,
  },
  nao_respondeu: {
    id: 'nao_respondeu', label: 'Não Respondeu', descricao: 'Lead parou de responder',
    cor: 'bg-gray-200', corTexto: 'text-gray-600', corBorda: 'border-gray-400',
    icone: 'MessageSquareOff', permite_retorno: false,
  },
  nao_compareceu: {
    id: 'nao_compareceu', label: 'Não Compareceu', descricao: 'Lead faltou à reunião',
    cor: 'bg-gray-200', corTexto: 'text-gray-600', corBorda: 'border-gray-400',
    icone: 'CalendarX', permite_retorno: false,
  },
  perdeu_por_preco: {
    id: 'perdeu_por_preco', label: 'Perdeu por Preço', descricao: 'Honorários acima do orçamento',
    cor: 'bg-orange-100', corTexto: 'text-orange-700', corBorda: 'border-orange-300',
    icone: 'TrendingDown', permite_retorno: false,
  },
  fechou_com_concorrente: {
    id: 'fechou_com_concorrente', label: 'Fechou c/ Concorrente', descricao: 'Escolheu outro escritório',
    cor: 'bg-orange-100', corTexto: 'text-orange-700', corBorda: 'border-orange-300',
    icone: 'Building2', permite_retorno: false,
  },
  reativacao_futura: {
    id: 'reativacao_futura', label: 'Reativação Futura', descricao: 'Potencial reativação programada',
    cor: 'bg-yellow-100', corTexto: 'text-yellow-700', corBorda: 'border-yellow-300',
    icone: 'RefreshCw', permite_retorno: true,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const ETAPAS_COMERCIAL_ORDENADAS = Object.values(ETAPAS_COMERCIAL)

export function getStageConfig(pipeline: string, etapa: string): StageConfig | undefined {
  if (pipeline === 'comercial')  return ETAPAS_COMERCIAL[etapa as EtapaComercial]
  if (pipeline === 'onboarding') return ETAPAS_ONBOARDING[etapa as EtapaOnboarding]
  if (pipeline === 'perdas')     return ETAPAS_PERDAS[etapa as EtapaPerdas]
  return undefined
}

// Etapas que permitem mover para perdas a partir delas
export const ETAPAS_PODEM_PERDER: EtapaComercial[] = [
  'triagem_iniciada', 'triagem_concluida', 'aguardando_documentos',
  'em_analise_viabilidade', 'reuniao_agendada', 'reuniao_realizada',
  'proposta_enviada', 'em_negociacao',
]

// Transições de etapa bloqueadas (ex: não pode voltar após assinar)
export const TRANSICOES_BLOQUEADAS: Array<{ de: string; para: string }> = [
  { de: 'contrato_enviado',              para: 'proposta_enviada' },
  { de: 'assinado_aguardando_pagamento', para: 'contrato_enviado' },
  { de: 'fechado',                       para: 'assinado_aguardando_pagamento' },
]
