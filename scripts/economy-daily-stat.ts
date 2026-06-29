/**
 * 일별 경제 집계 — cron 권장 (매일 KST 01:00)
 * npx tsx scripts/economy-daily-stat.ts
 * npx tsx scripts/economy-daily-stat.ts --backfill=14
 */
import { aggregateEconomyDailyStat, backfillEconomyDailyStats } from "../src/lib/apt/economy/daily-stat-service";

async function main() {
  const backfillArg = process.argv.find((a) => a.startsWith("--backfill"));
  if (backfillArg) {
    const days = Number(backfillArg.split("=")[1] ?? "14");
    const count = await backfillEconomyDailyStats(days);
    console.log(`✅ ${count}일 집계 완료`);
    return;
  }

  await aggregateEconomyDailyStat();
  console.log("✅ 어제(KST) 경제 집계 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
