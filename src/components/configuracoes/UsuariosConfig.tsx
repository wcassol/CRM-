'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2, UserX, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'

// Role name → display label
const ROLE_LABELS: Record<string, string> = {
  admin:       'Administrador',
  comercial:   'Comercial',
  juridico:    'Jurídico',
  financeiro:  'Financeiro',
  recepcao:    'Recepção',
}

const ROLE_COLORS: Record<string, string> = {
  admin:       'bg-purple-50 text-purple-700',
  comercial:   'bg-blue-50 text-blue-700',
  juridico:    'bg-amber-50 text-amber-700',
  financeiro:  'bg-green-50 text-green-700',
  recepcao:    'bg-gray-50 text-gray-700',
}

const InviteSchema = z.object({
  email:     z.string().email('E-mail inválido'),
  full_name: z.string().min(2, 'Nome obrigatório'),
  role_id:   z.string().uuid('Selecione um papel'),
})
type InviteInput = z.infer<typeof InviteSchema>

export function UsuariosConfig() {
  const { toast } = useToast()
  const utils     = trpc.useUtils()
  const [showForm, setShowForm] = useState(false)

  const { data: users, isLoading } = trpc.users.list.useQuery()
  const { data: roles }            = trpc.users.listRoles.useQuery()

  const invite = trpc.users.invite.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      toast({ title: 'Convite enviado com sucesso!' })
      setShowForm(false)
      reset()
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      toast({ title: 'Papel atualizado!' })
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const toggleActive = trpc.users.toggleActive.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate()
      toast({ title: 'Usuário desativado.' })
    },
    onError: (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteInput>({
    resolver: zodResolver(InviteSchema),
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Usuários</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os membros da equipe e seus papéis.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Convidar usuário'}
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <form
          onSubmit={handleSubmit(d => invite.mutate(d))}
          className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-blue-900">Novo convite</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
              <input
                {...register('full_name')}
                placeholder="João Silva"
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white',
                  errors.full_name ? 'border-red-400' : 'border-gray-200'
                )}
              />
              {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="joao@escritorio.com.br"
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white',
                  errors.email ? 'border-red-400' : 'border-gray-200'
                )}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Papel *</label>
            <select
              {...register('role_id')}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-white',
                errors.role_id ? 'border-red-400' : 'border-gray-200'
              )}
            >
              <option value="">Selecione...</option>
              {(roles ?? []).map(r => (
                <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.display_name}</option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs text-red-500 mt-0.5">{errors.role_id.message}</p>}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={invite.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {invite.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar convite
            </button>
          </div>
        </form>
      )}

      {/* Users list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : !users?.length ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Usuário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => {
                const roleName = (u as any).roles?.name ?? ''
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                          {u.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        defaultValue={u.role_id ?? ''}
                        onChange={e => updateRole.mutate({ id: u.id, role_id: e.target.value })}
                        className={cn(
                          'text-xs font-medium px-2 py-1 rounded-md border-0 outline-none cursor-pointer',
                          ROLE_COLORS[roleName] ?? 'bg-gray-50 text-gray-700'
                        )}
                      >
                        {(roles ?? []).map(r => (
                          <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.display_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium',
                        u.is_active ? 'text-green-600' : 'text-gray-400'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-green-500' : 'bg-gray-300')} />
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {u.is_active && (
                        <button
                          onClick={() => toggleActive.mutate({ id: u.id, is_active: false })}
                          title="Desativar usuário"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
