'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setAuthError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })

    if (error) {
      setAuthError(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : `Erro: ${error.message}`
      )
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] overflow-hidden border border-white/50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 px-8 py-9 text-center relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-purple-500/20 rounded-full" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CRM Jurídico</h1>
          <p className="text-purple-200 text-sm mt-1">Gestão comercial e operacional</p>
        </div>
      </div>

      {/* Form */}
      <div className="px-8 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Entrar na sua conta</h2>

        {authError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              E-mail
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className={cn(
                'w-full px-4 py-2.5 border rounded-xl text-sm outline-none transition-all',
                'focus:ring-2 focus:ring-purple-300 focus:border-purple-400',
                errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              )}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'w-full px-4 py-2.5 pr-10 border rounded-xl text-sm outline-none transition-all',
                  'focus:ring-2 focus:ring-purple-300 focus:border-purple-400',
                  errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all mt-2',
              'bg-gradient-to-r from-purple-600 to-purple-700 text-white',
              'hover:from-purple-700 hover:to-purple-800 active:scale-[0.99]',
              'shadow-[0_4px_16px_rgba(139,92,246,0.4)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.5)]',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none',
              'flex items-center justify-center gap-2'
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acesso apenas para usuários cadastrados pelo administrador.
        </p>
      </div>
    </div>
  )
}
