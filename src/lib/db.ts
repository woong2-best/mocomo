import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
      maxWait: 20_000,
      timeout: 60_000,
    },
  });
}

/** Reuse one client per warm isolate (required on Vercel/serverless + Supabase pooler). */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db;
}
