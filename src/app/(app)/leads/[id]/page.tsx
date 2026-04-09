'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, CheckCircle2, Circle, FileText, Upload, Clock, CheckSquare, Calendar, Send, CreditCard, Loader2, X } from 'lucide-react'
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

function TriagemTab({ lead }: { lead: any }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const { data: lossReasons } = trpc.settings.listLossReasons.useQuery({})

  const salvar = trpc.leads.salvarTriagem.useMutation({
    onSuccess: () => {
      utils.leads.byId.invalidate(lead.id)
      toast({ title: 'Triagem salva!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LeadTriagemInput>({
    resolver: zodResolver(LeadTriagemSchema),
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

const APPT_STATUS: Record<string, { label: string; color: string }> = {
  agendada:   { label: 'Agendada',   color: 'bg-blue-100 text-blue-700' },
  confirmada: { label: 'Confirmada', color: 'bg-indigo-100 text-indigo-700' },
  reagendada: { label: 'Reagendada', color: 'bg-amber-100 text-amber-700' },
  realizada:  { label: 'Realizada',  color: 'bg-green-100 text-green-700' },
  faltou:     { label: 'Faltou',     color: 'bg-orange-100 text-orange-700' },
  cancelada:  { label: 'Cancelada',  color: 'bg-red-100 text-red-700' },
}

function ReunioesTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('Reunião de consultoria')
  const [dataHora, setDataHora] = useState('')
  const [duracaoMin, setDuracaoMin] = useState(60)
  const [linkMeet, setLinkMeet] = useState('')
  const [resultId, setResultId] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<'realizada' | 'faltou' | 'cancelada'>('realizada')
  const [resultText, setResultText] = useState('')

  const { data = [], isLoading } = trpc.appointments.byLead.useQuery(leadId)

  const create = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.byLead.invalidate(leadId)
      setShowForm(false); setTitulo('Reunião de consultoria'); setDataHora(''); setLinkMeet('')
      toast({ title: 'Reunião agendada!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const registerResult = trpc.appointments.registerResult.useMutation({
    onSuccess: () => {
      utils.appointments.byLead.invalidate(leadId)
      setResultId(null); setResultText('')
      toast({ title: 'Resultado registrado!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const deleteAppt = trpc.appointments.delete.useMutation({
    onSuccess: () => { utils.appointments.byLead.invalidate(leadId); toast({ title: 'Reunião removida.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Reuniões</h3>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
          <Plus className="w-3.5 h-3.5" /> Agendar Reunião
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
              <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Reunião de consultoria" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data e Hora *</label>
              <input type="datetime-local" value={dataHora} onChange={e => setDataHora(e.target.value)} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Duração (min)</label>
              <input type="number" value={duracaoMin} onChange={e => setDuracaoMin(Number(e.target.value))} min={15} max={480} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Link da Reunião</label>
              <input value={linkMeet} onChange={e => setLinkMeet(e.target.value)} placeholder="https://meet.google.com/..." className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            <button
              onClick={() => {
                if (!dataHora) return
                create.mutate({ lead_id: leadId, titulo: titulo || 'Reunião de consultoria', data_hora: new Date(dataHora).toISOString(), duracao_min: duracaoMin, link_meet: linkMeet || null })
              }}
              disabled={!dataHora || create.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Agendar
            </button>
          </div>
        </div>
      )}

      {(data as any[]).length === 0 && !showForm ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma reunião agendada</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Agendar Reunião" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any[]).map((a: any) => (
            <div key={a.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{a.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.data_hora ? formatDateLabel(a.data_hora) : '—'} · {a.duracao_min ?? 60} min</p>
                  {a.link_meet && <a href={a.link_meet} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline">Abrir link →</a>}
                  {a.resultado && <p className="text-xs text-gray-500 mt-1 italic">"{a.resultado}"</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', APPT_STATUS[a.status]?.color ?? 'bg-gray-100 text-gray-600')}>
                    {APPT_STATUS[a.status]?.label ?? a.status}
                  </span>
                  {!['realizada','faltou','cancelada'].includes(a.status) && (
                    <button onClick={() => { setResultId(a.id); setResultStatus('realizada'); setResultText('') }} className="text-xs text-gray-400 hover:text-purple-600 underline">Resultado</button>
                  )}
                  {!['realizada','assinada'].includes(a.status) && (
                    <button onClick={() => deleteAppt.mutate(a.id)} disabled={deleteAppt.isPending} className="text-gray-300 hover:text-red-400 transition-colors" title="Remover"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
              {resultId === a.id && (
                <div className="mt-3 pt-3 border-t border-purple-100 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status *</label>
                    <select value={resultStatus} onChange={e => setResultStatus(e.target.value as any)} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-300">
                      <option value="realizada">Realizada</option>
                      <option value="faltou">Faltou</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Resultado {resultStatus === 'realizada' ? '*' : ''}</label>
                    <textarea value={resultText} onChange={e => setResultText(e.target.value)} rows={2} placeholder="Descreva como foi a reunião..." className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-purple-300 resize-none" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setResultId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                    <button
                      onClick={() => registerResult.mutate({ id: a.id, status: resultStatus, resultado: resultText || null })}
                      disabled={registerResult.isPending || (resultStatus === 'realizada' && resultText.trim().length < 5)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors"
                    >
                      {registerResult.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Proposta ────────────────────────────────────────────────────────────

const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  enviada:  { label: 'Enviada',  color: 'bg-blue-100 text-blue-700' },
  aceita:   { label: 'Aceita',   color: 'bg-green-100 text-green-700' },
  recusada: { label: 'Recusada', color: 'bg-red-100 text-red-700' },
  expirada: { label: 'Expirada', color: 'bg-gray-100 text-gray-400' },
}

function PropostaTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [valor, setValor] = useState('')
  const [condicao, setCondicao] = useState('')
  const [validadeDias, setValidadeDias] = useState(7)
  const [chance, setChance] = useState('')
  const [obs, setObs] = useState('')

  const { data = [], isLoading } = trpc.proposals.byLead.useQuery(leadId)

  const create = trpc.proposals.create.useMutation({
    onSuccess: () => {
      utils.proposals.byLead.invalidate(leadId)
      setShowForm(false); setValor(''); setCondicao(''); setObs(''); setChance('')
      toast({ title: 'Proposta criada!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const send = trpc.proposals.send.useMutation({
    onSuccess: () => { utils.proposals.byLead.invalidate(leadId); toast({ title: 'Proposta enviada!' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const update = trpc.proposals.update.useMutation({
    onSuccess: () => { utils.proposals.byLead.invalidate(leadId); toast({ title: 'Proposta atualizada!' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  function parseMoney(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Propostas</h3>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
          <Plus className="w-3.5 h-3.5" /> Nova Proposta
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$) *</label>
              <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Validade (dias)</label>
              <input type="number" value={validadeDias} onChange={e => setValidadeDias(Number(e.target.value))} min={1} max={90} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Condição de Pagamento</label>
              <input value={condicao} onChange={e => setCondicao(e.target.value)} placeholder="Ex: 30% entrada + 70% em 12x" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Chance de Fechamento (%)</label>
              <input type="number" value={chance} onChange={e => setChance(e.target.value)} min={0} max={100} placeholder="0 – 100" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
              <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            <button
              onClick={() => {
                const v = parseMoney(valor)
                if (!v) return toast({ title: 'Informe um valor válido', variant: 'destructive' })
                create.mutate({ lead_id: leadId, valor: v, condicao_pagamento: condicao || undefined, validade_dias: validadeDias, chance_fechamento_pct: chance ? Number(chance) : undefined, observacoes: obs || undefined })
              }}
              disabled={!valor || create.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Criar Proposta
            </button>
          </div>
        </div>
      )}

      {(data as any[]).length === 0 && !showForm ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma proposta criada</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Nova Proposta" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any[]).map((p: any) => (
            <div key={p.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-emerald-700 text-base">R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {p.condicao_pagamento && <p className="text-xs text-gray-500 mt-0.5">{p.condicao_pagamento}</p>}
                  {p.chance_fechamento_pct != null && <p className="text-xs text-gray-400 mt-0.5">Chance: {p.chance_fechamento_pct}%</p>}
                  {p.observacoes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.observacoes}</p>}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0', PROPOSAL_STATUS[p.status]?.color ?? 'bg-gray-100 text-gray-600')}>
                  {PROPOSAL_STATUS[p.status]?.label ?? p.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-purple-50">
                {p.status === 'rascunho' && (
                  <button onClick={() => send.mutate(p.id)} disabled={send.isPending} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Enviar ao cliente
                  </button>
                )}
                {p.status === 'enviada' && (
                  <>
                    <button onClick={() => update.mutate({ id: p.id, status: 'aceita' })} disabled={update.isPending} className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aceita
                    </button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => update.mutate({ id: p.id, status: 'recusada' })} disabled={update.isPending} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> Recusada
                    </button>
                  </>
                )}
                <span className="ml-auto text-[10px] text-gray-300">{formatDate(p.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Contrato ────────────────────────────────────────────────────────────

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  pendente:  { label: 'Pendente',  color: 'bg-amber-100 text-amber-700' },
  enviado:   { label: 'Enviado',   color: 'bg-blue-100 text-blue-700' },
  assinado:  { label: 'Assinado',  color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  expirado:  { label: 'Expirado',  color: 'bg-gray-100 text-gray-400' },
}

function ContratoTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [proposalId, setProposalId] = useState('')
  const [templateId, setTemplateId] = useState('')

  const { data = [], isLoading } = trpc.contracts.byLead.useQuery(leadId)
  const { data: proposals = [] } = trpc.proposals.byLead.useQuery(leadId)

  const send = trpc.contracts.send.useMutation({
    onSuccess: () => {
      utils.contracts.byLead.invalidate(leadId)
      setShowForm(false)
      toast({ title: 'Contrato enviado via ZapSign!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const update = trpc.contracts.update.useMutation({
    onSuccess: () => { utils.contracts.byLead.invalidate(leadId); toast({ title: 'Status atualizado.' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const hasActive = (data as any[]).some(c => ['enviado','assinado'].includes(c.status))
  const proposalsAceitas = (proposals as any[]).filter(p => ['aceita','enviada'].includes(p.status))

  if (isLoading) return <div className="h-20 rounded-2xl bg-gray-100 animate-pulse" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Contratos</h3>
        {!hasActive && (
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
            <Send className="w-3.5 h-3.5" /> Enviar Contrato
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500">O contrato será criado e enviado para assinatura via <strong>ZapSign</strong>.</p>
          <div className="space-y-3">
            {proposalsAceitas.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vincular a uma Proposta (opcional)</label>
                <select value={proposalId} onChange={e => setProposalId(e.target.value)} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                  <option value="">Nenhuma</option>
                  {proposalsAceitas.map((p: any) => (
                    <option key={p.id} value={p.id}>R$ {Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} – {p.status}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ID do Template ZapSign (opcional)</label>
              <input value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="Deixe em branco para usar o template padrão" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            <button
              onClick={() => send.mutate({ lead_id: leadId, proposal_id: proposalId || undefined, template_id: templateId || undefined })}
              disabled={send.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar
            </button>
          </div>
        </div>
      )}

      {(data as any[]).length === 0 && !showForm ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhum contrato gerado</p>
          <p className="text-xs text-gray-300 mt-1">Crie uma proposta aceita e envie o contrato via ZapSign</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data as any[]).map((c: any) => (
            <div key={c.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Contrato</p>
                  {c.enviado_em && <p className="text-xs text-gray-400 mt-0.5">Enviado em {formatDate(c.enviado_em)}</p>}
                  {c.assinado_em && <p className="text-xs text-green-600 mt-0.5">Assinado em {formatDate(c.assinado_em)}</p>}
                  {c.link_documento && <a href={c.link_documento} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline mt-1 block">Abrir documento →</a>}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0', CONTRACT_STATUS[c.status]?.color ?? 'bg-gray-100 text-gray-600')}>
                  {CONTRACT_STATUS[c.status]?.label ?? c.status}
                </span>
              </div>
              {c.status === 'enviado' && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-purple-50">
                  <span className="text-xs text-gray-400">Atualizar manualmente:</span>
                  <button onClick={() => update.mutate({ id: c.id, status: 'assinado', assinado_em: new Date().toISOString() })} disabled={update.isPending} className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
                    Marcar como assinado
                  </button>
                  <span className="text-gray-200">|</span>
                  <button onClick={() => update.mutate({ id: c.id, status: 'cancelado' })} disabled={update.isPending} className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Cobrança ────────────────────────────────────────────────────────────

function CobrancaTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [descricao, setDescricao] = useState('Honorários advocatícios')
  const [enviarAsaas, setEnviarAsaas] = useState(true)

  const { data = [], isLoading } = trpc.charges.byLead.useQuery(leadId)
  const { data: contracts = [] } = trpc.contracts.byLead.useQuery(leadId)

  const create = trpc.charges.create.useMutation({
    onSuccess: () => {
      utils.charges.byLead.invalidate(leadId)
      setShowForm(false); setValor(''); setVencimento(''); setDescricao('Honorários advocatícios')
      toast({ title: 'Cobrança criada!' + (enviarAsaas ? ' Link gerado no Asaas.' : '') })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const updateCharge = trpc.charges.update.useMutation({
    onSuccess: () => { utils.charges.byLead.invalidate(leadId); toast({ title: 'Cobrança atualizada!' }) },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  function parseMoney(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

  const assinadoId = (contracts as any[]).find(c => c.status === 'assinado')?.id
  const total = (data as any[]).reduce((s, c) => s + Number(c.valor ?? 0), 0)
  const totalPago = (data as any[]).filter(c => c.status_calculado === 'pago' || c.status === 'pago').reduce((s, c) => s + Number(c.valor ?? 0), 0)

  if (isLoading) return <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Cobranças</h3>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-semibold rounded-xl shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:from-purple-700 hover:to-purple-800 transition-all">
          <Plus className="w-3.5 h-3.5" /> Nova Cobrança
        </button>
      </div>

      {(data as any[]).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 rounded-2xl border border-purple-100 p-3 text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/80 rounded-2xl border border-green-100 p-3 text-center">
            <p className="text-xs text-gray-400">Pago</p>
            <p className="text-base font-bold text-green-700 mt-0.5">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$) *</label>
              <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Vencimento *</label>
              <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
              <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 bg-white" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={enviarAsaas} onChange={e => setEnviarAsaas(e.target.checked)} className="rounded text-purple-600" />
            <span className="font-semibold text-gray-700">Gerar link de pagamento no Asaas</span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            <button
              onClick={() => {
                const v = parseMoney(valor)
                if (!v || !vencimento) return toast({ title: 'Preencha valor e vencimento', variant: 'destructive' })
                create.mutate({ lead_id: leadId, contract_id: assinadoId ?? undefined, valor: v, vencimento, descricao: descricao || 'Honorários advocatícios', enviar_asaas: enviarAsaas })
              }}
              disabled={!valor || !vencimento || create.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-60 transition-colors"
            >
              {create.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
              Criar Cobrança
            </button>
          </div>
        </div>
      )}

      {(data as any[]).length === 0 && !showForm ? (
        <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
          <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Nenhuma cobrança cadastrada</p>
          <p className="text-xs text-gray-300 mt-1">Clique em "Nova Cobrança" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data as any[]).map((c: any) => (
            <div key={c.id} className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.descricao} · Vence {formatDate(c.vencimento)}</p>
                  {c.link_pagamento && <a href={c.link_pagamento} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline mt-1 block">Link de pagamento →</a>}
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium shrink-0',
                  (c.status_calculado ?? c.status) === 'pago'     ? 'bg-green-100 text-green-700' :
                  (c.status_calculado ?? c.status) === 'atrasado' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                )}>
                  {c.status_calculado ?? c.status}
                </span>
              </div>
              {c.status !== 'pago' && c.status_calculado !== 'pago' && (
                <div className="mt-3 pt-3 border-t border-purple-50">
                  <button onClick={() => updateCharge.mutate({ id: c.id, status: 'pago', pago_em: new Date().toISOString() })} disabled={updateCharge.isPending} className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como pago
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Aba Onboarding ──────────────────────────────────────────────────────────

function OnboardingTab({ leadId }: { leadId: string }) {
  const { toast } = useToast()
  const utils = trpc.useUtils()
  const [showAstrea, setShowAstrea] = useState(false)
  const [astreaRef, setAstreaRef] = useState('')

  const { data, isLoading } = trpc.onboarding.byLead.useQuery(leadId)

  const updateItem = trpc.onboarding.updateItem.useMutation({
    onSuccess: () => utils.onboarding.byLead.invalidate(leadId),
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  const sendToAstrea = trpc.onboarding.sendToAstrea.useMutation({
    onSuccess: () => {
      utils.onboarding.byLead.invalidate(leadId)
      setShowAstrea(false)
      toast({ title: 'Enviado ao Astrea com sucesso!' })
    },
    onError: e => toast({ title: e.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />)}</div>

  if (!data) return (
    <div className="bg-white/80 rounded-2xl border border-purple-100 p-10 text-center">
      <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400">Onboarding ainda não iniciado</p>
      <p className="text-xs text-gray-300 mt-1">O checklist é criado automaticamente após confirmação do pagamento</p>
    </div>
  )

  const onboarding = data as any
  const items = (onboarding.items ?? []) as any[]
  const concluidos = items.filter((i: any) => i.status === 'concluido').length
  const total = items.length
  const obrigatoriosPendentes = items.filter((i: any) => i.obrigatorio && i.status !== 'concluido').length
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Progresso */}
      <div className="bg-white/80 rounded-2xl border border-purple-100 p-4 shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900">Checklist de Onboarding</p>
          <span className="text-xs font-semibold text-purple-600">{concluidos}/{total} concluídos</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={cn('h-2 rounded-full transition-all duration-500', pct === 100 ? 'bg-green-500' : 'bg-purple-500')} style={{ width: `${pct}%` }} />
        </div>
        {onboarding.enviado_astrea_em && (
          <p className="text-xs text-green-600 mt-2 font-semibold">
            ✓ Enviado ao Astrea em {formatDate(onboarding.enviado_astrea_em)}{onboarding.referencia_astrea ? ` · Ref: ${onboarding.referencia_astrea}` : ''}
          </p>
        )}
      </div>

      {/* Itens clicáveis */}
      <div className="bg-white/80 rounded-2xl border border-purple-100 overflow-hidden shadow-[0_4px_24px_rgba(139,92,246,0.08)]">
        {items.map((item: any) => (
          <div
            key={item.id}
            onClick={() => !updateItem.isPending && updateItem.mutate({ id: item.id, status: item.status === 'concluido' ? 'pendente' : 'concluido' })}
            className={cn('flex items-center gap-3 px-4 py-3 border-b border-purple-50 last:border-0 transition-colors cursor-pointer', item.status !== 'concluido' ? 'hover:bg-purple-50/50' : 'opacity-70')}
          >
            <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', item.status === 'concluido' ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
              {item.status === 'concluido' && <span className="text-white text-[9px] font-bold">✓</span>}
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn('text-sm', item.status === 'concluido' ? 'text-gray-400 line-through' : 'text-gray-700 font-medium')}>{item.titulo}</span>
              {item.concluido_em && <p className="text-[10px] text-gray-400 mt-0.5">Concluído em {formatDate(item.concluido_em)}</p>}
            </div>
            {item.obrigatorio && <span className="text-[10px] text-red-400 font-semibold shrink-0">Obrigatório</span>}
          </div>
        ))}
      </div>

      {/* Enviar ao Astrea */}
      {!onboarding.enviado_astrea_em && (
        <div className={cn('rounded-2xl border p-4', obrigatoriosPendentes === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200')}>
          {obrigatoriosPendentes > 0 ? (
            <p className="text-xs text-gray-500"><span className="font-semibold text-amber-600">{obrigatoriosPendentes} item(s) obrigatório(s)</span> pendentes antes de enviar ao Astrea.</p>
          ) : !showAstrea ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-700 font-semibold">Todos os itens obrigatórios concluídos!</p>
              <button onClick={() => setShowAstrea(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors">
                <Send className="w-3.5 h-3.5" /> Enviar ao Astrea
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-700">Informe a referência do processo no Astrea:</p>
              <input value={astreaRef} onChange={e => setAstreaRef(e.target.value)} placeholder="Número ou referência no Astrea" className="w-full px-3 py-2 text-sm border border-green-200 rounded-xl outline-none focus:ring-2 focus:ring-green-300 bg-white" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAstrea(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                <button
                  onClick={() => sendToAstrea.mutate({ checklist_id: onboarding.id, referencia_astrea: astreaRef })}
                  disabled={sendToAstrea.isPending || !astreaRef.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {sendToAstrea.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Confirmar Envio
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
