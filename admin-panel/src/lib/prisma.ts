import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Prisma Singleton for Vercel Serverless Functions
// ─────────────────────────────────────────────────────────────────────────────
// In production (Vercel), each serverless invocation runs in an isolated
// module context. We attach the client to `globalThis` so that warm
// Lambda containers reuse the same connection instead of opening a new one
// on every request (which exhausts the PgBouncer pool).
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // For Prisma v7, use DATABASE_URL (pooler) for normal operations
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// ✅ Always cache on globalThis – both in dev and production
const prisma = globalThis._prisma ?? createPrismaClient()

if (!globalThis._prisma) {
  globalThis._prisma = prisma
}

export default prisma
