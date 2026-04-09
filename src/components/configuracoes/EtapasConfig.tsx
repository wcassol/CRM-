'use client'

import { useState } from 'react'
import { CheckCircle, Circle, ArrowRight } from 'lucide-react'

const PIPELINES = {
  comercial: {
    label: 'Pipeline Comercial',
    color: 'blue',
    etapas: [
      { id: 'novo_lead',                  label: 'Novo Lead',                   desc: 'Lead recém chegado, ainda não triado' },
      { id: 'triagem_iniciada',           label: 'Triagem Iniciada',            desc: 'Qualificação em andamento' },
      { id: 'triagem_concluida',          label: 'Triagem Concluída',           desc: 'Lead qualificado e aprovado' },
      { id: 'aguardando_documentos',      label: 'Aguardando Documentos',       desc: 'Documentação solicitada ao cliente' },
      { id: 'em_analise_viabilidade',     label: 'Em Análise de Viabilidade',   desc: 'Análise jurídica do caso' },
      { id: 'reuniao_agendada',           label: 'Reunião Agendada',            desc: 'Consulta marcada' },
      { id: 'reuniao_realizada',          label: 'Reunião Realizada',           desc: 'Consulta concluída' },
      { id: 'proposta_enviada',           label: 'Proposta Enviada',            desc: 'Proposta de honorários enviada' },
      { id: 'em_negociacao',              label: 'Em Negociação',               desc: 'Tratativa em andamento' },
      { id: 'contrato_enviado',           label: 'Contrato Enviado',            desc: 'Contrato aguardando assinatura' },
      { id: 'assinado_aguardando_pagamento', label: 'Assinado / Aguardando Pagamento', desc: 'Assinado, aguarda primeiro pagamento' },
      { id: 'fechado',                    label: 'Fechado',                     desc: 'Contrato ativo — cliente' },
    ],
  },
  onboarding: {
    label: 'Pipeline Onboarding',
    color: 'green',
    etapas: [
      { id: 'pagamento_confirmado',        label: 'Pagamento Confirmado',        desc: 'Primeiro pagamento recebido' },
      { id: 'checklist_entrada',           label: 'Checklist de Entrada',        desc: 'Documentação de entrada iniciada' },
      { id: 'documentacao_completa',       label: 'Documentação Completa',       desc: 'Todos os documentos recebidos' },
      { id: 'pasta_organizada',            label: 'Pasta Organizada',            desc: 'Dossiê do cliente organizado' },
      { id: 'cadastro_envio_astrea',       label: 'Cadastro / Envio Astrea',     desc: 'Cadastro no sistema jurídico' },
      { id: 'juridico_responsavel_definido', label: 'Jurídico Responsável',      desc: 'Advogado responsável definido' },
      { id: 'cliente_ativo',               label: 'Cliente Ativo',               desc: 'Onboarding concluído' },
    ],
  },
  perdas: {
    label: 'Pipeline de Perdas',
    color: 'red',
    etapas: [
      { id: 'sem_viabilidade',             label: 'Sem Viabilidade',             desc: 'Caso inviável juridicamente' },
      { id: 'sem_documentos',              label: 'Sem Documentos',              desc: 'Documentação insuficiente' },
      { id: 'nao_respondeu',               label: 'Não Respondeu',               desc: 'Lead sem contato após tentativas' },
      { id: 'nao_compareceu',              label: 'Não Compareceu',              desc: 'Não apareceu à reunião' },
      { id: 'perdeu_por_preco',            label: 'Perdeu por Preço',            desc: 'Honorários acima do esperado' },
      { id: 'fechou_com_concorrente',      label: 'Fechou com Concorrente',      desc: 'Contratou outro escritório' },
      { id: 'reativacao_futura',           label: 'Reativação Futura',           desc: 'Potencial de reativação' },
    ],
  },
}

const COLOR_MAP: Record<string, { badge: string; dot: string; header: string }> = {
  blue:  { badge: 'bg-blue-50 text-blue-700 border-blue-100',   dot: 'bg-blue-500',   header: 'bg-blue-600' },
  green: { badge: 'bg-green-50 text-green-700 border-green-100', dot: 'bg-green-500', header: 'bg-green-600' },
  red:   { badge: 'bg-red-50 text-red-700 border-red-100',       dot: 'bg-red-500',   header: 'bg-red-600' },
}

export function EtapasConfig() {
  const [activePipeline, setActivePipeline] = useState<keyof typeof PIPELINES>('comercial')
  const pipeline = PIPELINES[activePipeline]
  const colors = COLOR_MAP[pipeline.color]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Etapas do Pipeline</h2>
        <p className="text-sm text-gray-500 mt-0.5">Visualize as etapas configuradas de cada pipeline. As etapas são definidas no sistema e espelham o banco de dados.</p>
      </div>

      {/* Pipeline selector */}
      <div className="flex gap-2">
        {(Object.keys(PIPELINES) as Array<keyof typeof PIPELINES>).map(key => (
          <button
            key={key}
            onClick={() => setActivePipeline(key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activePipeline === key ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {PIPELINES[key].label}
          </button>
        ))}
      </div>

      {/* Etapas list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className={`${colors.header} px-5 py-3`}>
          <h3 className="text-sm font-semibold text-white">{pipeline.label}</h3>
          <p className="text-xs text-white/70 mt-0.5">{pipeline.etapas.length} etapas configuradas</p>
        </div>
        <div className="divide-y divide-gray-50">
          {pipeline.etapas.map((etapa, idx) => (
            <div key={etapa.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2 shrink-0">
                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{idx + 1}</span>
                {idx < pipeline.etapas.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                {idx === pipeline.etapas.length - 1 && <CheckCircle className="w-3 h-3 text-green-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{etapa.label}</p>
                <p className="text-xs text-gray-400">{etapa.desc}</p>
              </div>
              <code className="text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded hidden sm:block">{etapa.id}</code>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
        ℹ️ As etapas do pipeline são definidas diretamente no código e banco de dados. Para adicionar ou remover etapas, entre em contato com o administrador técnico.
      </p>
    </div>
  )
}
