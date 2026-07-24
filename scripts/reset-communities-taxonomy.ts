/**
 * 커뮤니티 카테고리 택소노미 v2 — 1회성으로 기존 커뮤니티 전부 삭제.
 * (구 enum 값이 남아 있으면 db push가 실패함. 이후 배포에서는 스킵)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARKER = "community-taxonomy-v2";

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_mocomo_migrations" (
      id TEXT PRIMARY KEY,
      done_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "_mocomo_migrations" WHERE id = $1 LIMIT 1`,
    MARKER
  );
  if (existing.length > 0) {
    console.log(`[reset-communities] skip — ${MARKER} already applied`);
    return;
  }

  const count = await prisma.community.count().catch(() => 0);
  if (count > 0) {
    const result = await prisma.community.deleteMany({});
    console.log(`[reset-communities] deleted ${result.count} communities`);
  } else {
    console.log("[reset-communities] no communities to delete");
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO "_mocomo_migrations" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    MARKER
  );
  console.log(`[reset-communities] marked ${MARKER}`);
}

main()
  .catch((e) => {
    console.error("[reset-communities]", e);
    process.exitCode = 0;
  })
  .finally(() => prisma.$disconnect());
