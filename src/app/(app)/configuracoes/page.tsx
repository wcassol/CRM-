'use client'

import { useState } from 'react'
import { Settings, Users, Layers, FileText, Plug, Tag, XCircle } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils/cn'
import { UsuariosConfig }       from '@/components/configuracoes/UsuariosConfig'
import { IntegracoesConfig }    from '@/components/configuracoes/IntegracoesConfig'
import { EtapasConfig }         from '@/components/configuracoes/EtapasConfig'
import { CamposPersonalizados } from '@/components/configuracoes/CamposPersonalizados'
import { TiposDocumento }       from '@/components/configuracoes/TiposDocumento'
import { MotivosPerda }         from '@/components/configuracoes/MotivosPerda'

type ConfigTab = 'usuarios' | 'etapas' | 'campos' | 'documentos' | 'integracoes' | 'motivos_perda'

const TABS: Array<{ id: ConfigTab; label: string; icon: React.ElementType; adminOnly?: boolean }> = [
  { id: 'usuarios',       label: 'Usuários',        icon: Users,   adminOnly: true },
  { id: 'etapas',         label: 'Etapas',           icon: Layers },
  { id: 'campos',         label: 'Campos Personalizados', icon: FileText },
  { id: 'documentos',     label: 'Tipos de Documento',   icon: FileText },
  { id: 'integracoes',    label: 'Integrações',      icon: Plug,    adminOnly: true },
  { id: 'motivos_perda',  label: 'Motivos de Perda', icon: XCircle },
]

export default function ConfiguracoesPage() {
  const canAccess = usePermission('configuracoes', 'ver')
  const [activeTab, setActiveTab] = useState<ConfigTab>('usuarios')

  if (!canAccess) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Você não tem permissão para acessar as configurações.</p>
      </div>
    )
  }

  return (
    <>
      <Topbar title="Configurações" />
      <main className="flex-1 overflow-hidden flex">
        {/* Sidebar de configurações */}
        <nav className="w-56 shrink-0 bg-white border-r border-gray-100 p-3 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'usuarios'      && <UsuariosConfig />}
          {activeTab === 'integracoes'   && <IntegracoesConfig />}
          {activeTab === 'etapas'        && <EtapasConfig />}
          {activeTab === 'campos'        && <CamposPersonalizados />}
          {activeTab === 'documentos'    && <TiposDocumento />}
          {activeTab === 'motivos_perda' && <MotivosPerda />}
        </div>
      </main>
    </>
  )
}
