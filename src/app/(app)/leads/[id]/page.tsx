'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, CheckCircle2, Circle, FileText, Upload, Clock, CheckSquare } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { trpc } from '@/lib/trpc/client'
import { Topbar } from '@/components/layout/Topbar'
import { LeadHeader } from '@/components/lead-detail/LeadHeader'
import { LeadTimeline } from '@/components/lead-detail/LeadTimeline'
import { LeadInfoPanel } from '@/components/lead-detail/LeadInfoPanel'
import { TarefaCreateModal } from '@/components/tarefas/TarefaCreateModal'
import { Skeleton } from '@/components/shared/LoadingSkeleton'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDateTime, formatDateLabel } from '@/lib/utils/format'
import { LeadTriagemSchema, type LeadTriagemInput } from '@/lib/validators/lead.schema'
import { useToast } from '@/hooks/useToast'

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
          <button onClick={() => router.back()} className="text-purple-600 hover:underline text-sm">
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
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leads
        </button>
      </Topbar>

      <main className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-10 w-96" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2"><Skeleton className="h-96 w-full rounded-2xl" /></div>
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          </div>
        ) : lead ? (
          <>
            <div className="px-6 pt-6 pb-0">
              <LeadHeader lead={lead} />
            </div>

            {/* Tabs */}
            <div className="px-6 mt-4 border-b border-purple-100">
              <div className="flex gap-0 overflow-x-auto scrollbar-hide">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex gap-4 p-6">
                <div className="flex-1 overflow-y-auto min-w-0">
                  <TabContent tab={activeTab} lead={lead} />
                </div>
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

// ─── Aba Triagem ─────────────────────────────────────────────────────────────

const AREAS = ['previdenciario','trabalhista','consumidor','civel','criminal','familia','tributario','empresarial']
const AREA_LABELS: Record<string, string> = { previdenciario: 'Previdenciário', trabalhista: 'Trabalhista', consumidor: 'Consumidor', civel: 'Cível', criminal: 'Criminal', familia: 'Família', tributario: 'Tributário', empresarial: 'Empresarial' }
const VIABILIDADE_LABELS: Record<string, string> = { viavel: 'Viável', inviavel: 'Inviável', pendente: 'Pendente' }
const URGENCIA_LABELS: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' }
const TEMPERATURA_LABELS: Record<string, string> = { frio: 'Frio', morno: 'Morno', quente: 'Quente' }

// Esquema local que aceita data no formato date input
const TriagemLocalSchema = LeadTriagemSchema.extend({
  data_fato: LeadTriagemSchema.shape.data_fato,
})

function TriagemTab({ lead }: { lead: any }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const { data: lossReasons } = trpc.settings.listLossReasons.useQuery()

  const salvar = trpc.leads.salvarTriagem.useMutation({
    onSuccess: () => {
      utils.leads.byId.invalidate(lead.id)
      toast({ title: 'Triagem salva!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LeadTriagemInput>({
    resolver: zodResolver(TriagemLocalSchema),
    defaultValues: {
      id:                     lead.id,
      area_juridica:          lead.area_juridica ?? '',
      subtipo_caso:           lead.subtipo_caso ?? '',
      resumo_caso:            lead.resumo_caso ?? '',
      parte_contraria:        lead.parte_contraria ?? '',
      data_fato:              lead.data_fato ?? undefined,
      urgencia:               lead.urgencia ?? 'media',
      prazo_sensivel:         lead.prazo_sensivel ?? false,
      tentou_resolver_antes:  lead.tentou_resolver_antes ?? false,
      ja_tem_advogado:        lead.ja_tem_advogado ?? false,
      viabilidade_preliminar: lead.viabilidade_preliminar ?? 'pendente',
      temperatura:            lead.temperatura ?? 'frio',
      chance_fechamento_pct:  lead.chance_fechamento_pct ?? undefined,
      loss_reason_id:         lead.loss_reason_id ?? undefined,
      motivo_perda_obs:       lead.motivo_perda_obs ?? '',
    },
  })

  const viabilidade = watch('viabilidade_preliminar')

  return (
    <form onSubmit={handleSubmit(d => salvar.mutate(d))} className="space-y-5">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)] space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Caso Jurídico</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área Jurídica *</label>
            <select {...register('area_juridica')} className={cn('w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300', errors.area_juridica ? 'border-red-400 bg-red-50' : 'border-gray-200')}>
              <option value="">Selecione...</option>
              {AREAS.map(a => <option key={a} value={a}>{AREA_LABELS[a]}</option>)}
            </select>
            {errors.area_juridica && <p className="text-xs text-red-500 mt-1">{errors.area_juridica.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subtipo do Caso</label>
            <input {...register('subtipo_caso')} placeholder="Ex: Aposentadoria por invalidez" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Resumo do Caso *</label>
          <textarea {...register('resumo_caso')} rows={3} placeholder="Descreva brevemente a situação do cliente..." className={cn('w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300 resize-none', errors.resumo_caso ? 'border-red-400 bg-red-50' : 'border-gray-200')} />
          {errors.resumo_caso && <p className="text-xs text-red-500 mt-1">{errors.resumo_caso.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Parte Contrária</label>
            <input {...register('parte_contraria')} placeholder="Nome da empresa/pessoa" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data do Fato</label>
            <input {...register('data_fato')} type="date" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer p-2.5 border border-gray-200 rounded-xl hover:bg-purple-50">
            <input type="checkbox" {...register('prazo_sensivel')} className="rounded text-purple-600" />
            <span>Prazo sensível</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer p-2.5 border border-gray-200 rounded-xl hover:bg-purple-50">
            <input type="checkbox" {...register('tentou_resolver_antes')} className="rounded text-purple-600" />
            <span>Tentou resolver antes</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer p-2.5 border border-gray-200 rounded-xl hover:bg-purple-50">
            <input type="checkbox" {...register('ja_tem_advogado')} className="rounded text-purple-600" />
            <span>Já tem advogado</span>
          </label>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)] space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Qualificação</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Urgência *</label>
            <select {...register('urgencia')} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300">
              {Object.entries(URGENCIA_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Temperatura *</label>
            <select {...register('temperatura')} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300">
              {Object.entries(TEMPERATURA_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Viabilidade *</label>
            <select {...register('viabilidade_preliminar')} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300">
              {Object.entries(VIABILIDADE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Chance de Fechamento (%)</label>
            <input {...register('chance_fechamento_pct', { valueAsNumber: true })} type="number" min={0} max={100} placeholder="0 – 100" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
        </div>

        {viabilidade === 'inviavel' && (
          <div className="space-y-3 border border-red-100 bg-red-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700">Lead marcado como inviável — informe o motivo de perda</p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motivo de Perda *</label>
              <select {...register('loss_reason_id')} className={cn('w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-purple-300', errors.loss_reason_id ? 'border-red-400' : 'border-gray-200')}>
                <option value="">Selecione...</option>
                {(lossReasons ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
              {errors.loss_reason_id && <p className="text-xs text-red-500 mt-1">{(errors.loss_reason_id as any).message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observação</label>
              <textarea {...register('motivo_perda_obs')} rows={2} placeholder="Detalhe o motivo..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={salvar.isPending} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 shadow-[0_4px_12px_rgba(139,92,246,0.3)] transition-all">
          {salvar.isPending ? 'Salvando...' : 'Salvar Triagem'}
        </button>
      </div>
    </form>
  )
}

// ─── Aba Documentos ──────────────────────────────────────────────────────────

const DOC_STATUS: Record<string, { label: string; color: string }> = {
  solicitado: { label: 'Solicitado',  color: 'bg-amber-100 text-amber-700' },
  recebido:   { label: 'Recebido',    color: 'bg-blue-100 text-blue-700' },
  validado:   { label: 'Validado',    color: 'bg-green-100 text-green-700' },
  rejeitado:  { label: 'Rejeitado',   color: 'bg-red-100 text-red-700' },
}

function DocumentosTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showAdd, setShowAdd] = useState(false)
  const [nomeDoc, setNomeDoc] = useState('')

  const { data = [], isLoading } = trpc.leads.documentsByLead.useQuery(leadId)

  const addDoc = trpc.leads.addDocument.useMutation({
    onSuccess: () => { utils.leads.documentsByLead.invalidate(leadId); setNomeDoc(''); setShowAdd(false); toast({ title: 'Documento solicitado.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const updateDoc = trpc.leads.updateDocument.useMutation({
    onSuccess: () => { utils.leads.documentsByLead.invalidate(leadId); toast({ title: 'Status atualizado.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Documentos do Lead</h3>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
          <Plus className="w-3.5 h-3.5" /> Solicitar Documento
        </button>
      </div>

      {showAdd && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex gap-2">
          <input
            value={nomeDoc}
            onChange={e => setNomeDoc(e.target.value)}
            placeholder="Nome do documento (ex: RG, CPF, Comprovante de Renda...)"
            className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white"
          />
          <button
            onClick={() => nomeDoc.trim() && addDoc.mutate({ lead_id: leadId, nome: nomeDoc.trim() })}
            disabled={!nomeDoc.trim() || addDoc.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            Adicionar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
      ) : (data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhum documento solicitado</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Solicitar Documento" para começar</p>
        </div>
      ) : (
        <div className="bg-white/80 rounded-2xl border border-purple-100 overflow-hidden shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
          {(data as any[]).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-purple-50 last:border-0 hover:bg-purple-50/50 transition-colors">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                doc.status === 'validado' ? 'bg-green-100' : doc.status === 'rejeitado' ? 'bg-red-100' : 'bg-amber-100'
              )}>
                {doc.status === 'validado'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : doc.status === 'rejeitado'
                  ? <Circle className="w-4 h-4 text-red-400" />
                  : <Upload className="w-4 h-4 text-amber-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.nome}</p>
                <p className="text-xs text-gray-400">{formatDate(doc.created_at)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full', DOC_STATUS[doc.status]?.color ?? 'bg-gray-100 text-gray-600')}>
                  {DOC_STATUS[doc.status]?.label ?? doc.status}
                </span>
                <select
                  value={doc.status}
                  onChange={e => updateDoc.mutate({ id: doc.id, status: e.target.value as any })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-purple-300"
                >
                  {Object.entries(DOC_STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Reuniões ────────────────────────────────────────────────────────────

function ReunioesTab({ leadId }: { leadId: string }) {
  const { data = [], isLoading } = trpc.appointments.byLead.useQuery(leadId)

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>

  return (
    <div className="space-y-3">
      {(data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma reunião agendada</p>
        </div>
      ) : (data as any[]).map((a: any) => (
        <div key={a.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-gray-900">{a.titulo}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.data_hora ? formatDateLabel(a.data_hora) : '—'}</p>
              {a.link_meet && <a href={a.link_meet} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline">Abrir link da reunião</a>}
            </div>
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0',
              a.status === 'realizada' ? 'bg-green-100 text-green-700' :
              a.status === 'cancelada' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            )}>
              {a.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Aba Proposta ────────────────────────────────────────────────────────────

function PropostaTab({ leadId }: { leadId: string }) {
  const { data = [] } = trpc.proposals.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {(data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center text-sm text-gray-400">Nenhuma proposta criada.</div>
      ) : (data as any[]).map((p: any) => (
        <div key={p.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
          <div className="flex justify-between items-center">
            <span className="font-bold text-emerald-700">R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{p.status}</span>
          </div>
          {p.condicao_pagamento && <p className="text-xs text-gray-500 mt-1">{p.condicao_pagamento}</p>}
        </div>
      ))}
    </div>
  )
}

// ─── Aba Contrato ────────────────────────────────────────────────────────────

function ContratoTab({ leadId }: { leadId: string }) {
  const { data = [] } = trpc.contracts.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {(data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center text-sm text-gray-400">Nenhum contrato gerado.</div>
      ) : (data as any[]).map((c: any) => (
        <div key={c.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Contrato</span>
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">{c.status}</span>
          </div>
          {c.link_documento && <a href={c.link_documento} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline mt-1 block">Abrir documento</a>}
        </div>
      ))}
    </div>
  )
}

// ─── Aba Cobrança ────────────────────────────────────────────────────────────

function CobrancaTab({ leadId }: { leadId: string }) {
  const { data = [] } = trpc.charges.byLead.useQuery(leadId)
  return (
    <div className="space-y-3">
      {(data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center text-sm text-gray-400">Nenhuma cobrança cadastrada.</div>
      ) : (data as any[]).map((c: any) => (
        <div key={c.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
              c.status_calculado === 'pago'     ? 'bg-green-100 text-green-700' :
              c.status_calculado === 'atrasado' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            )}>
              {c.status_calculado}
            </span>
          </div>
          {c.link_pagamento && <a href={c.link_pagamento} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline mt-1 block">Link de pagamento</a>}
        </div>
      ))}
    </div>
  )
}

// ─── Aba Onboarding ──────────────────────────────────────────────────────────

function OnboardingTab({ leadId }: { leadId: string }) {
  const { data } = trpc.onboarding.byLead.useQuery(leadId)
  if (!data) return <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center text-sm text-gray-400">Onboarding ainda não iniciado.</div>
  const onboarding = data as any
  return (
    <div className="bg-white/80 rounded-2xl border border-purple-100 p-5 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
      <p className="text-sm font-bold text-gray-900 mb-4">Checklist de Onboarding</p>
      <div className="space-y-2">
        {((onboarding.items ?? []) as any[]).map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 text-sm p-2.5 rounded-xl hover:bg-purple-50 transition-colors">
            <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              item.status === 'concluido' ? 'bg-green-500 border-green-500' : 'border-gray-300'
            )}>
              {item.status === 'concluido' && <span className="text-white text-[9px] font-bold">✓</span>}
            </div>
            <span className={item.status === 'concluido' ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}>
              {item.titulo}
            </span>
            {item.obrigatorio && <span className="text-red-400 text-[10px] font-bold ml-auto">Obrigatório</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Aba Tarefas ─────────────────────────────────────────────────────────────

const PRIORIDADE_COLOR: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  media:   'bg-amber-100 text-amber-700',
  baixa:   'bg-slate-100 text-slate-600',
}

function TarefasTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showCreate, setShowCreate] = useState(false)

  const { data = [], isLoading } = trpc.tasks.list.useQuery({ lead_id: leadId, page: 1, per_page: 50 })

  const complete = trpc.tasks.complete.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast({ title: 'Tarefa concluída!' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Tarefas</h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
          <Plus className="w-3.5 h-3.5" /> Nova Tarefa
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>
      ) : (data as any[]).length === 0 ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma tarefa criada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data as any[]).map((task: any) => (
            <div key={task.id} className={cn(
              'bg-white/80 rounded-2xl border p-3.5 flex items-start gap-3 shadow-[0_2px_12px_rgba(139,92,246,0.06)] hover:shadow-[0_4px_16px_rgba(139,92,246,0.1)] transition-all',
              task.esta_vencida && task.status !== 'concluida' ? 'border-red-200 bg-red-50/30' : 'border-purple-100'
            )}>
              <button
                onClick={() => task.status !== 'concluida' && complete.mutate({ id: task.id })}
                disabled={task.status === 'concluida' || complete.isPending}
                className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                title={task.status === 'concluida' ? 'Concluída' : 'Marcar como concluída'}
              >
                {task.status === 'concluida'
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className={cn('w-5 h-5', task.esta_vencida ? 'text-red-400' : 'text-gray-300 hover:text-purple-500')} />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold', task.status === 'concluida' && 'text-gray-400 line-through')}>
                  {task.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{task.responsavel_nome}</span>
                  <span>·</span>
                  <span className={cn(task.esta_vencida && task.status !== 'concluida' ? 'text-red-500 font-medium' : '')}>
                    {task.vencimento ? formatDate(task.vencimento) : '—'}
                  </span>
                  {task.esta_vencida && task.status !== 'concluida' && <span className="text-red-500 font-medium">vencida</span>}
                </div>
              </div>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0', PRIORIDADE_COLOR[task.prioridade])}>
                {task.prioridade}
              </span>
            </div>
          ))}
        </div>
      )}

      <TarefaCreateModal open={showCreate} onClose={() => setShowCreate(false)} leadId={leadId} />
    </div>
  )
}
