// =============================================================================
// CRM JURÍDICO — WEBHOOK SERVICE
// Idempotência, queue, retry e processamento centralizado
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/types/database.types'

export type WebhookSource =
  | 'zapconnecta'
  | 'zapsign'
  | 'asaas'
  | 'calcom'

export type WebhookStatus = 'pendente' | 'processando' | 'processado' | 'falha'

interface EnqueueParams {
  source:           WebhookSource
  event_type:       string
  idempotency_key:  string
  payload:          unknown
}

interface ProcessResult {
  /** Se o webhook foi processado agora (true) ou era duplicata (false) */
  isNew:      boolean
  queue_id:   string
}

export class WebhookService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Registra o webhook na fila.
   * Retorna isNew=false se a idempotency_key já existe (duplicata silenciosa).
   */
  async enqueue(params: EnqueueParams): Promise<ProcessResult> {
    const { data: existing } = await this.supabase
      .from('webhook_queue')
      .select('id, status')
      .eq('idempotency_key', params.idempotency_key)
      .maybeSingle()

    if (existing) {
      return { isNew: false, queue_id: existing.id }
    }

    const { data, error } = await this.supabase
      .from('webhook_queue')
      .insert({
        source:          params.source,
        event_type:      params.event_type,
        idempotency_key: params.idempotency_key,
        payload:         params.payload as any,
        status:          'processando' as WebhookStatus,
        tentativas:      0,
      })
      .select('id')
      .single()

    if (error) {
      // Conflito de idempotency_key por race condition → duplicata
      if (error.code === '23505') {
        const { data: dup } = await this.supabase
          .from('webhook_queue')
          .select('id')
          .eq('idempotency_key', params.idempotency_key)
          .single()
        return { isNew: false, queue_id: dup?.id ?? 'unknown' }
      }
      throw new Error(`Falha ao registrar webhook na queue: ${error.message}`)
    }

    return { isNew: true, queue_id: data.id }
  }

  /** Marca o processamento como concluído com sucesso */
  async markDone(queue_id: string): Promise<void> {
    await this.supabase
      .from('webhook_queue')
      .update({
        status:       'processado' as WebhookStatus,
        processado_em: new Date().toISOString(),
      })
      .eq('id', queue_id)
  }

  /** Marca o processamento como falha e incrementa tentativas */
  async markFailed(queue_id: string, error_msg: string): Promise<void> {
    await this.supabase.rpc('increment_webhook_tentativas', {
      p_queue_id: queue_id,
      p_error:    error_msg,
    })
  }

  /**
   * Constrói uma chave de idempotência padronizada.
   * Garante unicidade por (source, event_type, entidade externa).
   */
  static buildKey(source: WebhookSource, event_type: string, external_id: string): string {
    return `${source}:${event_type}:${external_id}`
  }
}
