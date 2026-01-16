# Multi-stage build for Messiah Dialogue Vault

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/embeddings/package.json ./packages/embeddings/
COPY packages/mcp/package.json ./packages/mcp/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build all packages
RUN pnpm build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/apps/web/build ./apps/web/build
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema for runtime
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

EXPOSE 3000

CMD ["node", "apps/web/build/server/index.js"]
