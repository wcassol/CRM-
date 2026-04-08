import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/shared/Toaster'
import type { Database } from '@/types/database.types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c: { name: string; value: string; options: Record<string, unknown> }[]) =>
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options as never)),
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase unreachable — redireciona para login
  }
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
      <Toaster />
    </div>
  )
}
