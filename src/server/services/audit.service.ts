import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DbAuditLogInsert, AuditAction } from '@/types/database.types'

interface AuditLogParams {
  entity_type:      string
  entity_id:        string
  action:           AuditAction
  usuario_id:       string | null
  dados_anteriores?: unknown
  dados_novos?:     unknown
  metadata?:        Record<string, unknown>
}

export class AuditService {
  constructor(private supabase: any) {}

  async log(params: AuditLogParams): Promise<void> {
    const entry: DbAuditLogInsert = {
      entity_type:      params.entity_type,
      entity_id:        params.entity_id,
      action:           params.action,
      usuario_id:       params.usuario_id,
      dados_anteriores: params.dados_anteriores as any ?? null,
      dados_novos:      params.dados_novos as any ?? null,
      ip_address:       null,
      user_agent:       null,
      metadata:         (params.metadata ?? {}) as any,
    }

    // Fire-and-forget — não bloqueia a resposta principal
    ;(this.supabase as any).from('audit_logs').insert(entry).then(({ error }: any) => {
      if (error && process.env.NODE_ENV !== 'production') {
        console.error('[AuditService] Erro ao gravar log:', error.message)
      }
    })
  }
}
