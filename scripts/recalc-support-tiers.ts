/**
 * DB enum 변경 후 기존 데이터 등급 재계산
 * npx tsx scripts/recalc-support-tiers.ts
 */
import { PrismaClient } from "@prisma/client";
import { tierFromAmount } from "../src/lib/tiers";

const prisma = new PrismaClient();

async function main() {
  const supports = await prisma.creatorSupport.findMany();
  for (const s of supports) {
    const tier = tierFromAmount(s.totalAmount);
    if (tier !== s.tier) {
      await prisma.creatorSupport.update({ where: { id: s.id }, data: { tier } });
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, totalSupportSent: true, totalSupportReceived: true },
  });
  for (const u of users) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        supportTierSent: tierFromAmount(u.totalSupportSent),
        supportTierReceived: tierFromAmount(u.totalSupportReceived),
      },
    });
  }

  console.log("✅ 등급 재계산 완료");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
