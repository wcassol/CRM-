/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Docker / EasyPanel ────────────────────────────────────────────────────
  output: 'standalone',

  // ─── Imagens ───────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ─── HTTP Security Headers ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
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
      { source: '/', destination: '/dashboard', permanent: false },
    ]
  },

  env: {},

  // ─── Webpack ──────────────────────────────────────────────────────────────
  webpack(config, { isServer }) {
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
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },

  // ─── Logging ──────────────────────────────────────────────────────────────
  logging: {
    fetches: { fullUrl: false },
  },
}

export default nextConfig
