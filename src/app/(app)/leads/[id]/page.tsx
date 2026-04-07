'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'
import { LeadHeader } from '@/components/lead-detail/LeadHeader'
import { LeadTimeline } from '@/components/lead-detail/LeadTimeline'
import { LeadInfoPanel } from '@/components/lead-detail/LeadInfoPanel'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { cn } from '@/lib/utils/cn'

type Tab =
  | 'visao_geral'
  | 'triagem'
  | 'documentos'
  | 'reunioes'
  | 'proposta'
  | 'contrato'
  | 'cobranca'
  | 'onboarding'
  | 'tarefas'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'visao_geral', label: 'Visão Geral' },
  { id: 'triagem',     label: 'Triagem' },
  { id: 'documentos',  label: 'Documentos' },
  { id: 'reunioes',    label: 'Reuniões' },
  { id: 'proposta',    label: 'Proposta' },
  { id: 'contrato',    label: 'Contrato' },
  { id: 'cobranca',    label: 'Cobrança' },
  { id: 'onboarding',  label: 'Onboarding' },
  { id: 'tarefas',     label: 'Tarefas' },
]

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('visao_geral')

  const { data: lead, isLoading, error } = trpc.leads.byId.useQuery(id)

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Lead não encontrado ou sem permissão de acesso.</p>
          <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm">
            ← Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Topbar>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leads
        </button>
      </Topbar>

      <main className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-96" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Skeleton className="h-96 w-full rounded-xl" /></div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        ) : lead ? (
          <>
            {/* Header do lead */}
            <div className="px-6 pt-6 pb-0">
              <LeadHeader lead={lead} />
            </div>

            {/* Tabs */}
            <div className="px-6 mt-4 border-b border-gray-200">
              <div className="flex gap-0 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo das tabs */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex gap-4 p-6">
                {/* Coluna principal */}
                <div className="flex-1 overflow-y-auto min-w-0">
                  <TabContent tab={activeTab} lead={lead} />
                </div>

                {/* Painel lateral */}
                <div className="w-72 shrink-0 overflow-y-auto space-y-4">
                  <LeadInfoPanel lead={lead} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </>
  )
}

function TabContent({ tab, lead }: { tab: Tab; lead: any }) {
  // Import dinâmico — cada aba é carregada sob demanda
  switch (tab) {
    case 'visao_geral': return <LeadTimeline leadId={lead.id} />
    case 'triagem':     return <TriagemTab lead={lead} />
    case 'documentos':  return <DocumentosTab leadId={lead.id} />
    case 'reunioes':    return <ReunioesTab leadId={lead.id} />
    case 'proposta':    return <PropostaTab leadId={lead.id} />
    case 'contrato':    return <ContratoTab leadId={lead.id} />
    case 'cobranca':    return <CobrancaTab leadId={lead.id} />
    case 'onboarding':  return <OnboardingTab leadId={lead.id} />
    case 'tarefas':     return <TarefasTab leadId={lead.id} />
    default:            return null
  }
}

// ─── Placeholders de tabs (cada uma será um componente próprio) ───────────────
// Em produção, importar os componentes dedicados de cada aba

function TriagemTab({ lead }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-sm text-gray-500">Formulário de triagem — componente: TriagemForm</p>
    </div>
  )
}

function DocumentosTab({ leadId }: { leadId: string }) {
  const { data, isLoading } = trpc.leads.byId.useQuery(leadId)
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-sm text-gray-500">Checklist de documentos — componente: DocumentChecklist</p>
    </div>
  )
}

function ReunioesTab({ leadId }: { leadId: string }) {
  const { data, isLoading } = trpc.appointments.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {((data ?? []) as any[]).map((a: any) => (
        <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="font-medium text-sm">{a.titulo}</p>
          <p className="text-xs text-gray-500">{a.data_hora}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
            a.status === 'realizada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
          )}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  )
}

function PropostaTab({ leadId }: { leadId: string }) {
  const { data } = trpc.proposals.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {((data ?? []) as any[]).map((p: any) => (
        <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex justify-between">
            <span className="font-semibold text-green-700">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.status}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{p.condicao_pagamento}</p>
        </div>
      ))}
    </div>
  )
}

function ContratoTab({ leadId }: { leadId: string }) {
  const { data } = trpc.contracts.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {((data ?? []) as any[]).map((c: any) => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Contrato</span>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{c.status}</span>
          </div>
          {c.link_documento && (
            <a href={c.link_documento} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
              Abrir documento
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function CobrancaTab({ leadId }: { leadId: string }) {
  const { data } = trpc.charges.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {((data ?? []) as any[]).map((c: any) => (
        <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex justify-between">
            <span className="font-semibold">R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full',
              c.status_calculado === 'pago'     ? 'bg-green-100 text-green-700' :
              c.status_calculado === 'atrasado' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            )}>
              {c.status_calculado}
            </span>
          </div>
          {c.link_pagamento && (
            <a href={c.link_pagamento} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
              Link de pagamento
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

function OnboardingTab({ leadId }: { leadId: string }) {
  const { data } = trpc.onboarding.byLead.useQuery(leadId)
  if (!data) return <div className="text-sm text-gray-400 p-4">Onboarding ainda não iniciado.</div>
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <p className="text-sm font-medium mb-3">Checklist de Onboarding</p>
      <div className="space-y-2">
        {(data.items ?? []).map((item: any) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center',
              item.status === 'concluido' ? 'bg-green-500 border-green-500' : 'border-gray-300'
            )}>
              {item.status === 'concluido' && <span className="text-white text-[10px]">✓</span>}
            </div>
            <span className={item.status === 'concluido' ? 'text-gray-400 line-through' : 'text-gray-700'}>
              {item.titulo}
            </span>
            {item.obrigatorio && <span className="text-red-400 text-[10px]">*</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function TarefasTab({ leadId }: { leadId: string }) {
  const { data } = trpc.tasks.list.useQuery({ lead_id: leadId, page: 1, per_page: 50 })
  return (
    <div className="space-y-2">
      {(data ?? []).map((task: any) => (
        <div key={task.id} className={cn(
          'bg-white rounded-xl border p-3 flex items-start gap-3',
          task.esta_vencida ? 'border-red-200' : 'border-gray-100'
        )}>
          <div className={cn('w-4 h-4 rounded border-2 shrink-0 mt-0.5',
            task.status === 'concluida' ? 'bg-green-500 border-green-500' : 'border-gray-300'
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{task.titulo}</p>
            <p className="text-xs text-gray-400">{task.responsavel_nome} · {task.vencimento}</p>
          </div>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            task.prioridade === 'urgente' ? 'bg-red-100 text-red-700' :
            task.prioridade === 'alta'    ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'
          )}>
            {task.prioridade}
          </span>
        </div>
      ))}
    </div>
  )
}
