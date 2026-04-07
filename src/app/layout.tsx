import type { Metadata } from 'next'
import { TRPCProvider } from '@/providers/TRPCProvider'
import { Toaster } from '@/components/shared/Toaster'
import './globals.css'

export const metadata: Metadata = {
  title:       { default: 'CRM Jurídico', template: '%s | CRM Jurídico' },
  description: 'Sistema de gestão comercial e operacional para escritórios de advocacia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased bg-gray-50">
        <TRPCProvider>
          {children}
          <Toaster />
        </TRPCProvider>
      </body>
    </html>
  )
}
