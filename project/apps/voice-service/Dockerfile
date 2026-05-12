# ==========================================
# AASOP Voice Service - Multi-Stage Dockerfile
# ==========================================

# -------- Stage 1: Base --------
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# -------- Stage 2: Dependencies --------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared/package.json ./packages/shared/
COPY apps/voice-service/package.json ./apps/voice-service/
RUN pnpm install --frozen-lockfile --ignore-scripts

# -------- Stage 3: Builder --------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build:voice-service

# -------- Stage 4: Production Dependencies --------
FROM base AS production-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/shared/package.json ./packages/shared/
COPY apps/voice-service/package.json ./apps/voice-service/
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

# -------- Stage 5: Runner --------
FROM node:20-alpine AS runner
RUN apk add --no-cache curl ca-certificates ffmpeg
ENV NODE_ENV=production
ENV PORT=4400

WORKDIR /app

RUN addgroup --system --gid 1001 aasop && \
    adduser --system --uid 1001 aasop

COPY --from=builder --chown=aasop:aasop /app/apps/voice-service/dist ./dist
COPY --from=builder --chown=aasop:aasop /app/apps/voice-service/package.json ./
COPY --from=production-deps --chown=aasop:aasop /app/node_modules ./node_modules
COPY --from=production-deps --chown=aasop:aasop /app/packages ./packages

USER aasop

EXPOSE 4400

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:4400/health || exit 1

CMD ["node", "dist/main.js"]
