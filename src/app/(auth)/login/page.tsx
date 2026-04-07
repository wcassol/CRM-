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
          : 'Erro ao entrar. Tente novamente.'
      )
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur mb-4">
          <Scale className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">CRM Jurídico</h1>
        <p className="text-blue-200 text-sm mt-1">Gestão comercial e operacional</p>
      </div>

      {/* Form */}
      <div className="px-8 py-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Entrar na sua conta</h2>

        {authError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
              )}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'w-full px-3 py-2.5 pr-10 border rounded-lg text-sm outline-none transition-colors',
                  'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
              'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
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
