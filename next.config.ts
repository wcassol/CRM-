import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // ─── Docker / EasyPanel ────────────────────────────────────────────────────
  // Gera build standalone: inclui apenas dependências necessárias, sem node_modules
  // Reduz tamanho da imagem de ~700 MB para ~100 MB
  output: 'standalone',

  // ─── Imagens ───────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google avatars
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ─── HTTP Security Headers ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Impede clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Força HTTPS por 1 ano (incluindo subdomínios)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Impede MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer seguro
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissões do browser — desabilita câmera/microfone por padrão
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // 'unsafe-eval' necessário para Next.js dev
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
              "font-src 'self'",
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Webhooks não precisam de CSP — são chamados por terceiros
      {
        source: '/api/webhooks/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ]
  },

  // ─── Redirects ─────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Raiz redireciona para dashboard
      { source: '/', destination: '/dashboard', permanent: false },
    ]
  },

  // ─── Variáveis públicas expostas ao browser ────────────────────────────────
  // Apenas variáveis NEXT_PUBLIC_ são expostas automaticamente.
  // Listar aqui para documentação — não adiciona ao bundle servidor.
  env: {},

  // ─── Webpack (otimizações) ─────────────────────────────────────────────────
  webpack(config, { isServer }) {
    // Reduz bundle do servidor excluindo módulos desnecessários no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, crypto: false,
      }
    }
    return config
  },

  // ─── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    // Turbopack para dev mais rápido (Next.js 14+)
    turbo: {},
    // Server Actions habilitados por padrão no Next.js 14
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },

  // ─── Logging ──────────────────────────────────────────────────────────────
  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
}

export default nextConfig
