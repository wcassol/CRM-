// =============================================================================
// CRM JURÍDICO — PIPELINE SERVICE
// Toda lógica de transição de etapa passa por aqui
// =============================================================================

import { TRPCError } from '@trpc/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, PipelineType } from '@/types/database.types'
import { TRANSICOES_BLOQUEADAS } from '@/lib/constants/pipeline-stages'
import { AuditService } from './audit.service'
import { NotificationService } from './notification.service'

interface MoveStageParams {
  lead_id:        string
  pipeline:       PipelineType
  etapa_nova:     string
  usuario_id:     string
  motivo?:        string
  loss_reason_id?: string
}

export class PipelineService {
  private audit: AuditService
  private notify: NotificationService

  constructor(private supabase: any) {
    this.audit  = new AuditService(supabase)
    this.notify = new NotificationService(supabase)
  }

  async moveStage(params: MoveStageParams): Promise<void> {
    const { lead_id, pipeline, etapa_nova, usuario_id, motivo, loss_reason_id } = params

    // 1. Buscar lead atual
    const { data: lead, error: fetchError } = await this.supabase
      .from('leads')
      .select('id, pipeline_atual, etapa_comercial, etapa_onboarding, etapa_perdas, responsavel_comercial_id, responsavel_juridico_id')
      .eq('id', lead_id)
      .single()

    if (fetchError || !lead) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead não encontrado.' })
    }

    // 2. Determinar etapa anterior
    const etapa_anterior =
      pipeline === 'comercial'  ? lead.etapa_comercial  :
      pipeline === 'onboarding' ? lead.etapa_onboarding :
      lead.etapa_perdas

    // 3. Verificar se a transição está bloqueada
    const bloqueada = TRANSICOES_BLOQUEADAS.find(
      t => t.de === etapa_anterior && t.para === etapa_nova
    )
    if (bloqueada) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Não é possível retornar de "${etapa_anterior}" para "${etapa_nova}".`,
      })
    }

    // 4. RN-03: Perda exige motivo
    if (pipeline === 'perdas' && !loss_reason_id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'RN-03: Motivo de perda obrigatório ao mover para pipeline de perdas.',
      })
    }

    // 5. Montar atualização do lead
    const updateData: Record<string, unknown> = {
      pipeline_atual: pipeline,
    }
    if (pipeline === 'comercial')  updateData.etapa_comercial  = etapa_nova
    if (pipeline === 'onboarding') updateData.etapa_onboarding = etapa_nova
    if (pipeline === 'perdas') {
      updateData.etapa_perdas    = etapa_nova
      updateData.loss_reason_id  = loss_reason_id
      if (params.motivo) updateData.motivo_perda_obs = params.motivo
    }

    // 6. Atualizar lead (o trigger do banco grava o pipeline_history automaticamente)
    const { error: updateError } = await this.supabase
      .from('leads')
      .update(updateData)
      .eq('id', lead_id)

    if (updateError) {
      // Tratar erros de regras de negócio do banco (P0001, P0002)
      if (updateError.code === 'P0001') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: updateError.message })
      }
      if (updateError.code === 'P0002') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: updateError.message })
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })
    }

    // 7. Audit log
    await this.audit.log({
      entity_type: 'lead',
      entity_id:   lead_id,
      action:      'stage_change',
      usuario_id,
      dados_anteriores: { pipeline: lead.pipeline_atual, etapa: etapa_anterior },
      dados_novos:      { pipeline, etapa: etapa_nova, motivo },
    })

    // 8. Ações colaterais por etapa
    await this.handleSideEffects({ lead_id, pipeline, etapa_nova, usuario_id, lead })
  }

  private async handleSideEffects(params: {
    lead_id:   string
    pipeline:  PipelineType
    etapa_nova: string
    usuario_id: string
    lead: { responsavel_comercial_id: string | null; responsavel_juridico_id: string | null }
  }): Promise<void> {
    const { lead_id, pipeline, etapa_nova, usuario_id, lead } = params

    // Criar tarefas automáticas por etapa
    const taskMap: Partial<Record<string, { titulo: string; dias: number }>> = {
      novo_lead:             { titulo: 'Iniciar triagem do lead', dias: 1 },
      triagem_concluida:     { titulo: 'Solicitar documentos ao lead', dias: 2 },
      reuniao_realizada:     { titulo: 'Enviar proposta comercial', dias: 1 },
      proposta_enviada:      { titulo: 'Fazer follow-up da proposta', dias: 3 },
      contrato_enviado:      { titulo: 'Verificar assinatura do contrato', dias: 2 },
      pagamento_confirmado:  { titulo: 'Iniciar checklist de onboarding', dias: 1 },
    }

    const taskConfig = taskMap[etapa_nova]
    if (taskConfig && lead.responsavel_comercial_id) {
      const vencimento = new Date()
      vencimento.setDate(vencimento.getDate() + taskConfig.dias)

      await this.supabase.from('tasks').insert({
        lead_id,
        titulo:         taskConfig.titulo,
        responsavel_id: lead.responsavel_comercial_id,
        vencimento:     vencimento.toISOString(),
        prioridade:     'media',
        created_by:     usuario_id,
      })
    }

    // Notificar jurídico quando chega em onboarding
    if (pipeline === 'onboarding' && etapa_nova === 'pagamento_confirmado') {
      if (lead.responsavel_juridico_id) {
        await this.notify.send({
          usuario_id:  lead.responsavel_juridico_id,
          tipo:        'onboarding_iniciado',
          titulo:      'Novo cliente para onboarding',
          mensagem:    'Um cliente foi fechado e está aguardando onboarding.',
          entity_type: 'lead',
          entity_id:   lead_id,
        })
      }
    }
  }
}
