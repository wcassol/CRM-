'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { initials } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

const ROLE_LABELS: Record<string, string> = {
  admin:        'Administrador',
  comercial:    'Comercial',
  pre_juridico: 'Pré-Jurídico',
  juridico:     'Jurídico',
  financeiro:   'Financeiro',
}

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { user } = useCurrentUser()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!user) return null
  const role = (user.roles as any)?.name

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-100"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_2px_8px_rgba(139,92,246,0.3)]">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-xs font-bold">
              {initials(user.full_name)}
            </span>
          )}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 leading-none">{user.full_name.split(' ')[0]}</p>
          <p className="text-[10px] text-purple-400 mt-0.5 font-medium">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-[0_12px_40px_rgba(139,92,246,0.15)] border border-purple-100 z-20 overflow-hidden py-1">
            <div className="px-4 py-3 border-b border-purple-50">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <MenuItem icon={User}     label="Meu Perfil"     onClick={() => { router.push('/perfil'); setOpen(false) }} />
            <MenuItem icon={Settings} label="Configurações"  onClick={() => { router.push('/configuracoes'); setOpen(false) }} />
            <div className="border-t border-purple-50 mt-1 pt-1">
              <MenuItem icon={LogOut} label="Sair" onClick={handleLogout} danger />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
