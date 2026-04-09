'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, User, Phone, Mail, Shield } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils/cn'

const ProfileSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  phone:     z.string().optional(),
})
type ProfileInput = z.infer<typeof ProfileSchema>

const PasswordSchema = z.object({
  current_password: z.string().min(6, 'Senha atual obrigatória'),
  new_password:     z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres'),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'As senhas não coincidem',
  path: ['confirm_password'],
})
type PasswordInput = z.infer<typeof PasswordSchema>

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  comercial:    'Comercial',
  juridico:     'Jurídico',
  financeiro:   'Financeiro',
  pre_juridico: 'Pré-Jurídico',
}

export default function PerfilPage() {
  const { toast }  = useToast()
  const utils      = trpc.useUtils()
  const { data: me, isLoading } = trpc.users.me.useQuery()

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => { utils.users.me.invalidate(); toast({ title: 'Perfil atualizado!' }) },
    onError:   (e) => toast({ title: e.message, variant: 'destructive' }),
  })

  const { register: regProfile, handleSubmit: submitProfile, formState: { errors: errProfile } } = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    values: { full_name: me?.full_name ?? '', phone: me?.phone ?? '' },
  })

  const { register: regPass, handleSubmit: submitPass, reset: resetPass, formState: { errors: errPass } } = useForm<PasswordInput>({
    resolver: zodResolver(PasswordSchema),
  })

  const [changingPass, setChangingPass] = useState(false)

  const roleName = (me as any)?.roles?.name ?? ''

  return (
    <>
      <Topbar title="Meu Perfil" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Avatar + info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {me?.full_name?.charAt(0)?.toUpperCase() ?? <User className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{me?.full_name ?? '—'}</h2>
              <p className="text-sm text-gray-500">{me?.email}</p>
              {roleName && (
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                  {ROLE_LABELS[roleName] ?? roleName}
                </span>
              )}
            </div>
          </div>

          {/* Edit profile */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Dados pessoais
            </h3>
            <form onSubmit={submitProfile(d => updateProfile.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
                <input
                  {...regProfile('full_name')}
                  className={cn('w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-400', errProfile.full_name ? 'border-red-400' : 'border-gray-200')}
                />
                {errProfile.full_name && <p className="text-xs text-red-500 mt-0.5">{errProfile.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" /> Telefone
                </label>
                <input
                  {...regProfile('phone')}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                >
                  {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar alterações
                </button>
              </div>
            </form>
          </div>

          {/* Email (read-only) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" /> E-mail
            </h3>
            <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">{me?.email ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-2">O e-mail não pode ser alterado. Entre em contato com o administrador.</p>
          </div>

          {/* Permissions */}
          {(me as any)?.roles?.permissions && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" /> Permissões do perfil
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries((me as any).roles.permissions as Record<string, Record<string, boolean>>).map(([modulo, perms]) => (
                  <div key={modulo} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                    <span className="text-xs font-medium text-gray-700 capitalize">{modulo}</span>
                    <span className={cn('text-xs', perms.ver ? 'text-green-600' : 'text-gray-400')}>
                      {perms.ver ? '✓' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
