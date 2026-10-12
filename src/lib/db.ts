import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** connection_limit=1 + overlapping queries (JWT write + findUnique) → P2024. */
function withPrismaPoolBudget(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const limit = Number(parsed.searchParams.get("connection_limit") ?? "1");
    if (Number.isFinite(limit) && limit < 3) {
      parsed.searchParams.set("connection_limit", "3");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient() {
  const datasourceUrl = withPrismaPoolBudget(process.env.DATABASE_URL ?? "");
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
      maxWait: 20_000,
      timeout: 60_000,
    },
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
}

/** Reuse one client per warm isolate (required on Vercel/serverless + Supabase pooler). */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}
