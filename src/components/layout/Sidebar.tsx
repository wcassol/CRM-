'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CheckSquare, GitMerge,
  Settings, Scale, ChevronRight, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
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
      { href: '/onboarding', label: 'Onboarding', icon: GitMerge },
      { href: '/relatorios', label: 'Relatórios', icon: FileText },
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
    <aside className="w-64 shrink-0 min-h-screen flex flex-col bg-white border-r border-purple-100 shadow-[4px_0_24px_rgba(139,92,246,0.08)]">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-purple-100">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_4px_12px_rgba(139,92,246,0.4)]">
          <Scale className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-gray-900 font-bold text-sm leading-none">CRM Jurídico</p>
          <p className="text-purple-400 text-[10px] mt-0.5 font-medium">Gestão comercial</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-6 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <ul className="space-y-1">
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
      <div className="p-4 border-t border-purple-100">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-purple-400 font-medium">v0.1.0 — CRM Jurídico</p>
        </div>
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group',
          active
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)]'
            : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-gray-400 group-hover:text-purple-500')} />
        <span className="flex-1 font-medium">{item.label}</span>
        {item.badge ? (
          <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
            {item.badge}
          </span>
        ) : (
          <ChevronRight className={cn(
            'w-3 h-3 transition-opacity',
            active ? 'opacity-100 text-white/70' : 'opacity-0 group-hover:opacity-100 text-purple-400'
          )} />
        )}
      </Link>
    </li>
  )
}
