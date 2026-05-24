/**
 * Supabase SQL 동기화 (스키마 불일치 복구)
 * npx tsx scripts/run-supabase-sync.ts
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const sql = readFileSync(join(__dirname, "supabase-sync.sql"), "utf-8");
  const statements = sql
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 10 && !s.startsWith("DO $$"));

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log("OK:", stmt.slice(0, 60).replace(/\s+/g, " ") + "...");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log("skip (exists):", stmt.slice(0, 40));
      } else {
        console.warn("warn:", msg.slice(0, 120));
      }
    }
  }

  console.log("\n→ npx prisma db push --accept-data-loss");
  console.log("→ npm run db:seed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
