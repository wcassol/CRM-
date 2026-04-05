import { Topbar } from '@/components/layout/Topbar'
import { DashboardView } from '@/components/dashboard/DashboardView'

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <DashboardView />
      </main>
    </>
  )
}
