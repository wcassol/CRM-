'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, GitMerge,
  Settings, Scale, ChevronRight, FileText, CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePermission } from '@/hooks/usePermission'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
  perm?: { modulo: string; acao: string }
  badge?: number
}

const navigation: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/leads',     label: 'Leads',       icon: Users },
      { href: '/tarefas',   label: 'Tarefas',     icon: CheckSquare },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/onboarding',   label: 'Onboarding',  icon: GitMerge },
      { href: '/relatorios',   label: 'Relatórios',  icon: FileText },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 bg-slate-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Scale className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">CRM Jurídico</p>
          <p className="text-slate-500 text-[10px] mt-0.5">Gestão comercial</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem key={item.href} item={item} active={
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href)
                } />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 text-center">v0.1.0 — CRM Jurídico</p>
      </div>
    </aside>
  )
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all group',
          active
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 font-medium">{item.label}</span>
        {item.badge ? (
          <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
            {item.badge}
          </span>
        ) : (
          <ChevronRight className={cn(
            'w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity',
            active && 'opacity-100'
          )} />
        )}
      </Link>
    </li>
  )
}
