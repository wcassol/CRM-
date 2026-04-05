'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GitMerge, CheckCircle2, Lock, ExternalLink } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { EmptyState } from '@/components/shared/EmptyState'
import { AstreaModal } from './AstreaModal'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'

export function OnboardingListView() {
  const { data, isLoading } = trpc.onboarding.list.useQuery()
  const [astreaModal, setAstreaModal] = useState<{ checklistId: string; leadNome: string } | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon={GitMerge}
        title="Nenhum onboarding ativo"
        description="Os onboardings aparecem aqui após confirmação de pagamento."
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 max-w-4xl">
        {data.map((item) => {
          const pct = item.total_obrigatorios > 0
            ? Math.round((item.obrigatorios_concluidos / item.total_obrigatorios) * 100)
            : 0

          return (
            <div
              key={item.checklist_id}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads/${item.lead_id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {item.cliente_nome}
                    </Link>
                    {item.area_juridica && (
                      <span className="text-xs text-gray-400 capitalize">{item.area_juridica}</span>
                    )}
                  </div>

                  {item.responsavel_juridico && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Jurídico: <span className="font-medium">{item.responsavel_juridico}</span>
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {item.obrigatorios_concluidos}/{item.total_obrigatorios} itens obrigatórios
                      </span>
                      <span className={cn(
                        'text-xs font-semibold',
                        pct === 100 ? 'text-green-600' : 'text-blue-600'
                      )}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          pct === 100 ? 'bg-green-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {item.enviado_astrea_em ? (
                    <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Enviado ao Astrea
                    </div>
                  ) : item.pode_enviar_astrea ? (
                    <button
                      onClick={() => setAstreaModal({ checklistId: item.checklist_id, leadNome: item.cliente_nome })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Enviar ao Astrea
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Lock className="w-3.5 h-3.5" />
                      Checklist incompleto
                    </div>
                  )}

                  <Link
                    href={`/leads/${item.lead_id}?tab=onboarding`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver checklist
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal envio ao Astrea */}
      {astreaModal && (
        <AstreaModal
          checklistId={astreaModal.checklistId}
          leadNome={astreaModal.leadNome}
          onClose={() => setAstreaModal(null)}
        />
      )}
    </>
  )
}
