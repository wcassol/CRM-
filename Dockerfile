# =============================================================================
# CRM JURÍDICO — Dockerfile Multi-Stage
# Resultado: imagem Alpine ~100 MB com Next.js standalone
#
# Stages:
#   1. deps     — instala dependências de produção + dev (para build)
#   2. builder  — compila a aplicação Next.js
#   3. runner   — imagem final mínima (apenas o necessário para rodar)
# =============================================================================

# ─── Stage 1: Dependências ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Instala dependências de sistema necessárias para alguns pacotes nativos
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copia apenas os arquivos de manifesto — aproveita cache do Docker
COPY package.json package-lock.json* ./

# Instala TODAS as dependências (incluindo dev — necessário para o build)
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copia dependências do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copia código fonte
COPY . .

# Variáveis necessárias em build-time (NEXT_PUBLIC_ são injetadas no bundle)
# Valores reais são fornecidos em runtime — aqui apenas placeholders
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key
ARG NEXT_PUBLIC_APP_URL=https://crm.placeholder.com

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Desabilita telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
# output: 'standalone' (next.config.ts) gera .next/standalone com deps mínimas
RUN npm run build

# ─── Stage 3: Runner (imagem final) ──────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Segurança: não executar como root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Variáveis de runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Porta — EasyPanel pode sobrescrever via variável PORT
ENV PORT=80
ENV HOSTNAME=0.0.0.0

# Copia arquivos públicos estáticos
COPY --from=builder /app/public ./public

# Copia o build standalone (inclui node_modules minificados)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ajusta permissões
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 80

# Health check — usa a mesma porta que o app está escutando
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

# Inicia com o servidor standalone do Next.js
CMD ["node", "server.js"]
