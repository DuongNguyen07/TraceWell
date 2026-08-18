import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    // Keep well under Supabase session-mode limit (15).
    // For production scale, switch DATABASE_URL to the transaction pooler (port 6543).
    max: 3,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always cache — the previous production guard caused a new Pool per request, exhausting connections.
if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient()
export const prisma = globalForPrisma.prisma
