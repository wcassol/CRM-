'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw, Copy, Check, Tag, Webhook } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'

interface IntegrationField {
  name:         string
  label:        string
  placeholder?: string
  secret?:      boolean
  hint?:        string
  fullWidth?:   boolean
}

interface IntegrationMeta {
  key:         string
  label:       string
  description: string
  fields:      IntegrationField[]
  webhookInfo?: {
    url:         string
    description: string
    events:      string[]
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.zapconnecta.com'

const INTEGRATIONS: IntegrationMeta[] = [
  {
    key:         'zapconnecta',
    label:       'Helena CRM (WhatsApp)',
    description: 'Recepção automática de leads via WhatsApp. Filtre por etiqueta para que apenas contatos qualificados virem leads.',
    fields: [
      {
        name:        'api_key',
        label:       'API Key (Bearer Token)',
        placeholder: 'pn_0000000000000000000000',
        secret:      true,
        hint:        'Encontre em: Ajustes → Integrações → Integração via API',
      },
      {
        name:        'webhook_secret',
        label:       'Webhook Secret',
        placeholder: 'Crie uma senha forte para validar o webhook',
        secret:      true,
        hint:        'Configure este mesmo valor no campo "Token" ao criar o webhook na Helena',
      },
      {
        name:        'etiquetas_lead',
        label:       'Etiquetas que viram Lead (separadas por vírgula)',
        placeholder: 'lead, juridico, prospect, consumidor',
        hint:        'Somente contatos com essas etiquetas serão capturados. Deixe vazio para capturar todos.',
        fullWidth:   true,
      },
    ],
    webhookInfo: {
      url:         `${APP_URL}/api/webhooks/helena`,
      description: 'Configure este URL na Helena: Configurações → Integrações → Web hooks → Novo Webhook',
      events:      ['contact.created', 'contact.updated'],
    },
  },
  {
    key:         'zapsign',
    label:       'ZapSign',
    description: 'Assinatura digital de contratos via WhatsApp.',
    fields: [
      { name: 'api_token',      label: 'API Token',      placeholder: 'zs-...',              secret: true },
      { name: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Chave de validação',  secret: true },
    ],
  },
  {
    key:         'asaas',
    label:       'Asaas',
    description: 'Cobranças, boletos e PIX.',
    fields: [
      { name: 'api_key',        label: 'API Key',         placeholder: '$aas_...',            secret: true },
      { name: 'wallet_id',      label: 'Wallet ID',       placeholder: 'ID da carteira' },
      { name: 'webhook_token',  label: 'Webhook Token',   placeholder: 'Token de validação',  secret: true },
    ],
  },
  {
    key:         'calcom',
    label:       'Cal.com',
    description: 'Agendamento de reuniões e entrevistas.',
    fields: [
      { name: 'api_key',         label: 'API Key',        placeholder: 'cal_...',             secret: true },
      { name: 'event_type_id',   label: 'Event Type ID',  placeholder: 'ID do tipo de evento' },
      { name: 'webhook_secret',  label: 'Webhook Secret', secret: true },
    ],
  },
  {
    key:         'n8n',
    label:       'n8n',
    description: 'Hub central de automações e webhooks.',
    fields: [
      { name: 'base_url', label: 'URL base', placeholder: 'https://n8n.seudominio.com.br' },
      { name: 'api_key',  label: 'API Key',  secret: true },
    ],
  },
  {
    key:         'astrea',
    label:       'Astrea',
    description: 'Gestão de processos jurídicos.',
    fields: [
      { name: 'api_token',  label: 'API Token',   secret: true },
      { name: 'account_id', label: 'Account ID',  placeholder: 'ID da conta' },
    ],
  },
]

const ConfigSchema = z.record(z.string())
type ConfigInput = z.infer<typeof ConfigSchema>

// ─── Botão copiar ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
      title="Copiar"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  )
}

// ─── Card de integração ───────────────────────────────────────────────────────

function IntegrationCard({ meta }: { meta: IntegrationMeta }) {
  const { toast } = useToast()
  const utils     = trpc.useUtils()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const chave = meta.key as 'zapsign' | 'asaas' | 'calcom' | 'n8n' | 'astrea' | 'zapconnecta'
  const { data } = trpc.integracoes.get.useQuery({ chave })

  const save = trpc.integracoes.save.useMutation({
    onSuccess: () => {
      utils.integracoes.get.invalidate({ chave })
      toast({ title: `${meta.label} configurado com sucesso!` })
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const testConn = trpc.integracoes.test.useMutation({
    onSuccess: (r) => toast({
      title: r.ok ? `${meta.label}: conexão OK ✓` : `${meta.label}: falha — ${r.message}`,
      variant: r.ok ? 'default' : 'destructive',
    }),
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit } = useForm<ConfigInput>({
    values: data?.config as ConfigInput ?? {},
  })

  const isActive = data?.ativo ?? false
  const hasCreds = data?.config && Object.keys(data.config).length > 0

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100 overflow-hidden shadow-[0_4px_24px_rgba(139,92,246,0.06)]">

      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-purple-50">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">{meta.label}</h3>
            {isActive
              ? <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Ativo</span>
              : <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3.5 h-3.5" /> Inativo</span>
            }
          </div>
          <p className="text-xs text-gray-500">{meta.description}</p>
        </div>

        {hasCreds && (
          <button
            onClick={() => testConn.mutate({ chave })}
            disabled={testConn.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 rounded-xl hover:bg-purple-50 hover:text-purple-700 transition-colors disabled:opacity-50 shrink-0 ml-4"
          >
            {testConn.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Testar
          </button>
        )}
      </div>

      {/* Bloco de webhook info (Helena) */}
      {meta.webhookInfo && (
        <div className="mx-5 mt-5 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 space-y-4">

          {/* URL */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Webhook className="w-4 h-4 text-purple-600 shrink-0" />
              <p className="text-xs font-bold text-purple-900">URL do Webhook</p>
            </div>
            <div className="flex items-center gap-1 bg-white border border-purple-200 rounded-xl px-3 py-2">
              <code className="text-xs text-purple-700 flex-1 break-all font-mono">{meta.webhookInfo.url}</code>
              <CopyButton text={meta.webhookInfo.url} />
            </div>
            <p className="text-[11px] text-purple-600 mt-1.5">{meta.webhookInfo.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meta.webhookInfo.events.map(ev => (
                <span key={ev} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono font-semibold">{ev}</span>
              ))}
            </div>
          </div>

          {/* Explicação etiquetas */}
          <div className="border-t border-purple-100 pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-4 h-4 text-purple-600 shrink-0" />
              <p className="text-xs font-bold text-purple-900">Como funciona o filtro por etiqueta</p>
            </div>
            <p className="text-xs text-purple-700 leading-relaxed">
              Quando um contato chega pelo WhatsApp, o CRM verifica suas etiquetas na Helena.
              Somente contatos com <strong>pelo menos uma</strong> das etiquetas configuradas serão transformados em leads.
              Os demais são ignorados silenciosamente.
            </p>
            <div className="bg-white rounded-xl border border-purple-100 p-3 mt-3 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Exemplos de etiquetas:</p>
              <div className="flex flex-wrap gap-1.5">
                {['lead', 'juridico', 'prospect', 'consumidor', 'trabalhista', 'previdenciario'].map(t => (
                  <span key={t} className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                    ['consumidor', 'trabalhista', 'previdenciario'].includes(t)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  )}>{t}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                Etiquetas de área jurídica (verde-azuladas) também definem a área do lead automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de credenciais */}
      <form onSubmit={handleSubmit(d => save.mutate({ chave, config: d }))} className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {meta.fields.map(field => (
            <div key={field.name} className={cn(field.fullWidth && 'sm:col-span-2')}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  {...register(field.name)}
                  type={field.secret && !showSecrets[field.name] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition-all bg-gray-50 focus:bg-white pr-9"
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => setShowSecrets(p => ({ ...p, [field.name]: !p[field.name] }))}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {field.hint && <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <button
            type="submit"
            disabled={save.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 transition-all shadow-[0_4px_12px_rgba(139,92,246,0.3)]"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function IntegracoesConfig() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Integrações</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure as credenciais das plataformas integradas ao CRM.
          As chaves são armazenadas de forma criptografada.
        </p>
      </div>

      <div className="space-y-4">
        {INTEGRATIONS.map(meta => (
          <IntegrationCard key={meta.key} meta={meta} />
        ))}
      </div>
    </div>
  )
}
