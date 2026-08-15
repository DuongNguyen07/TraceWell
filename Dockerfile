# ================================================================
# Stage 1 — production-only dependencies
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

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client (no DB connection needed at build time)
RUN npx prisma generate

RUN npm run build

# ================================================================
# Stage 3 — minimal production image
# ================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Standalone server + static assets from the build
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static

# Overlay the full production node_modules on top of standalone's traced subset.
# This ensures the Prisma CLI + migration engine are available for the entrypoint,
# since Next.js's standalone tracer only bundles modules imported by route handlers
# (not CLI binaries invoked via npx).
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma schema + migrations — needed so `migrate deploy` can find migration files.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Entrypoint that runs migrations before starting the server
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
