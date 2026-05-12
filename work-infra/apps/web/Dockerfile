# ==========================================
# AASOP Web Frontend - Multi-Stage Dockerfile
# ==========================================

# -------- Stage 1: Base Dependencies --------
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# -------- Stage 2: Dependencies --------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------- Stage 3: Builder --------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:4000}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build:web

# -------- Stage 4: Runner --------
FROM node:20-alpine AS runner
RUN apk add --no-cache curl ca-certificates
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 aasop && \
    adduser --system --uid 1001 aasop

# Copy only necessary files for production
COPY --from=builder --chown=aasop:aasop /app/apps/web/.next/standalone ./
COPY --from=builder --chown=aasop:aasop /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=aasop:aasop /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=aasop:aasop /app/apps/web/package.json ./apps/web/
COPY --from=builder --chown=aasop:aasop /app/node_modules ./node_modules
COPY --from=builder --chown=aasop:aasop /app/packages ./packages

WORKDIR /app/apps/web

USER aasop

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
