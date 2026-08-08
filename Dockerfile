# ================================================================
# Stage 1 — install production dependencies
# ================================================================
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ================================================================
# Stage 2 — build the Next.js app
# ================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dev deps too (needed for tsx, typescript, etc.)
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client from the schema (no DB connection needed at build time)
RUN npx prisma generate

RUN npm run build

# ================================================================
# Stage 3 — minimal production image
# ================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Standalone server + static assets from the build
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
