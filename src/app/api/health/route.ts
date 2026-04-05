// =============================================================================
// CRM JURÍDICO — Health Check & Readiness Probe
//
// GET /api/health
//   Usado por: Docker HEALTHCHECK, EasyPanel, load balancer, uptime monitors
//   Retorna 200 quando a app está pronta para receber tráfego
//   Retorna 503 quando algum subsistema crítico está indisponível
//
// Checks realizados:
//   - Supabase connectivity (query leve na tabela roles)
//   - Variáveis de ambiente críticas presentes
//   - Uptime e versão da aplicação
// =============================================================================

import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/server'

// Cache: revalida a cada 5s para não sobrecarregar o Supabase
export const revalidate = 5

interface HealthStatus {
  status:   'ok' | 'degraded' | 'error'
  version:  string
  uptime_s: number
  checks:   Record<string, { status: 'ok' | 'error'; latency_ms?: number; message?: string }>
  timestamp: string
}

const APP_START = Date.now()

export async function GET() {
  const checks: HealthStatus['checks'] = {}
  let overallStatus: HealthStatus['status'] = 'ok'

  // ─── Check 1: Variáveis de ambiente críticas ─────────────────────────────
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const missingVars = requiredEnvVars.filter(v => !process.env[v])

  if (missingVars.length > 0) {
    checks['env_vars'] = { status: 'error', message: `Variáveis faltando: ${missingVars.join(', ')}` }
    overallStatus = 'error'
  } else {
    checks['env_vars'] = { status: 'ok' }
  }

  // ─── Check 2: Conectividade Supabase ─────────────────────────────────────
  const dbStart = Date.now()
  try {
    const supabase = createAdminSupabase()
    const { error } = await supabase
      .from('roles')
      .select('id')
      .limit(1)
      .single()

    const latency = Date.now() - dbStart

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = nenhum resultado (OK para health check — banco acessível)
      checks['supabase'] = { status: 'error', latency_ms: latency, message: error.message }
      overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus
    } else {
      checks['supabase'] = { status: 'ok', latency_ms: latency }

      // Alerta se latência > 500ms (degraded, não error)
      if (latency > 500 && overallStatus === 'ok') {
        checks['supabase'] = { status: 'ok', latency_ms: latency, message: 'Alta latência' }
        overallStatus = 'degraded'
      }
    }
  } catch (e) {
    checks['supabase'] = {
      status:  'error',
      latency_ms: Date.now() - dbStart,
      message: e instanceof Error ? e.message : 'Erro desconhecido',
    }
    overallStatus = 'error'
  }

  // ─── Resposta ─────────────────────────────────────────────────────────────
  const body: HealthStatus = {
    status:    overallStatus,
    version:   process.env.npm_package_version ?? '0.1.0',
    uptime_s:  Math.floor((Date.now() - APP_START) / 1000),
    checks,
    timestamp: new Date().toISOString(),
  }

  const httpStatus = overallStatus === 'error' ? 503 : 200

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      // Não cachear health checks em CDN
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
