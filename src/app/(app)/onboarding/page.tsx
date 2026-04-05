'use client'

import { Topbar } from '@/components/layout/Topbar'
import { OnboardingListView } from '@/components/onboarding/OnboardingListView'

export default function OnboardingPage() {
  return (
    <>
      <Topbar title="Onboarding" />
      <main className="flex-1 overflow-y-auto p-6">
        <OnboardingListView />
      </main>
    </>
  )
}
