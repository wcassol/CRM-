import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, DbNotificationInsert } from '@/types/database.types'

interface SendParams {
  usuario_id:   string
  tipo:         string
  titulo:       string
  mensagem?:    string
  entity_type?: string
  entity_id?:   string
}

export class NotificationService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async send(params: SendParams): Promise<void> {
    const entry: DbNotificationInsert = {
      usuario_id:  params.usuario_id,
      tipo:        params.tipo,
      titulo:      params.titulo,
      mensagem:    params.mensagem ?? null,
      entity_type: params.entity_type ?? null,
      entity_id:   params.entity_id ?? null,
      lida:        false,
      lida_em:     null,
    }

    const { error } = await this.supabase.from('notifications').insert(entry)
    if (error && process.env.NODE_ENV !== 'production') {
      console.error('[NotificationService] Erro:', error.message)
    }
  }

  async sendToMany(usuario_ids: string[], params: Omit<SendParams, 'usuario_id'>): Promise<void> {
    const entries: DbNotificationInsert[] = usuario_ids.map(id => ({
      usuario_id:  id,
      tipo:        params.tipo,
      titulo:      params.titulo,
      mensagem:    params.mensagem ?? null,
      entity_type: params.entity_type ?? null,
      entity_id:   params.entity_id ?? null,
      lida:        false,
      lida_em:     null,
    }))

    await this.supabase.from('notifications').insert(entries)
  }
}
