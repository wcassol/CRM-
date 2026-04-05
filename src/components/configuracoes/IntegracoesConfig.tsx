'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'

interface IntegrationMeta {
  key:         string
  label:       string
  description: string
  fields:      Array<{ name: string; label: string; placeholder?: string; secret?: boolean }>
  docsUrl?:    string
}

const INTEGRATIONS: IntegrationMeta[] = [
  {
    key:         'zapsign',
    label:       'ZapSign',
    description: 'Assinatura digital de contratos via WhatsApp.',
    fields: [
      { name: 'api_token', label: 'API Token', placeholder: 'zs-...', secret: true },
      { name: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Chave de validação', secret: true },
    ],
  },
  {
    key:         'asaas',
    label:       'Asaas',
    description: 'Cobranças, boletos e PIX.',
    fields: [
      { name: 'api_key',    label: 'API Key',    placeholder: '$aas_...', secret: true },
      { name: 'wallet_id',  label: 'Wallet ID',  placeholder: 'ID da carteira' },
      { name: 'webhook_token', label: 'Webhook Token', placeholder: 'Token de validação', secret: true },
    ],
  },
  {
    key:         'calcom',
    label:       'Cal.com',
    description: 'Agendamento de reuniões e entrevistas.',
    fields: [
      { name: 'api_key',      label: 'API Key',       placeholder: 'cal_...', secret: true },
      { name: 'event_type_id', label: 'Event Type ID', placeholder: 'ID do tipo de evento' },
      { name: 'webhook_secret', label: 'Webhook Secret', secret: true },
    ],
  },
  {
    key:         'n8n',
    label:       'n8n',
    description: 'Hub central de automações e webhooks.',
    fields: [
      { name: 'base_url',   label: 'URL base',    placeholder: 'https://n8n.seudominio.com.br' },
      { name: 'api_key',    label: 'API Key',     secret: true },
    ],
  },
  {
    key:         'astrea',
    label:       'Astrea',
    description: 'Gestão de processos jurídicos.',
    fields: [
      { name: 'api_token', label: 'API Token', secret: true },
      { name: 'account_id', label: 'Account ID', placeholder: 'ID da conta' },
    ],
  },
  {
    key:         'zapconnecta',
    label:       'ZapConnecta / Helena CRM',
    description: 'Recepção de leads via WhatsApp.',
    fields: [
      { name: 'webhook_secret', label: 'Webhook Secret', secret: true },
      { name: 'instance_id', label: 'Instance ID', placeholder: 'ID da instância' },
    ],
  },
]

const ConfigSchema = z.record(z.string())
type ConfigInput = z.infer<typeof ConfigSchema>

function IntegrationCard({ meta }: { meta: IntegrationMeta }) {
  const { toast } = useToast()
  const utils     = trpc.useUtils()
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const { data } = trpc.integracoes.get.useQuery({ chave: meta.key })
  const save     = trpc.integracoes.save.useMutation({
    onSuccess: () => {
      utils.integracoes.get.invalidate({ chave: meta.key })
      toast({ title: `${meta.label} configurado com sucesso!` })
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })
  const testConn = trpc.integracoes.test.useMutation({
    onSuccess: (r) => toast({ title: r.ok ? `${meta.label}: conexão OK ✓` : `${meta.label}: falha na conexão`, variant: r.ok ? 'default' : 'destructive' }),
    onError:   (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit } = useForm<ConfigInput>({
    values: data?.config as ConfigInput ?? {},
  })

  const isActive  = data?.ativo ?? false
  const hasCreds  = data?.config && Object.keys(data.config).length > 0

  const toggleSecret = (name: string) =>
    setShowSecrets(prev => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
              {isActive ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <XCircle className="w-3.5 h-3.5" />
                  Inativo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
          </div>
        </div>

        {hasCreds && (
          <button
            onClick={() => testConn.mutate({ chave: meta.key })}
            disabled={testConn.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {testConn.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
            Testar conexão
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(d => save.mutate({ chave: meta.key, config: d }))} className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {meta.fields.map(field => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{field.label}</label>
              <div className="relative">
                <input
                  {...register(field.name)}
                  type={field.secret && !showSecrets[field.name] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 pr-9"
                />
                {field.secret && (
                  <button
                    type="button"
                    onClick={() => toggleSecret(field.name)}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showSecrets[field.name]
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}

export function IntegracoesConfig() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Integrações</h2>
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
