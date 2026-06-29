/**
 * 활성 유저 부정행위 스캔
 * npx tsx scripts/economy-fraud-scan.ts
 */
import { initFraudAdmin, scanActiveUsersForFraud } from "../src/lib/apt/economy/fraud/admin-fraud-service";

async function main() {
  await initFraudAdmin();
  const limit = Math.min(500, Math.max(1, Number(process.env.FRAUD_SCAN_LIMIT) || 200));
  console.log(`… 활성 유저 ${limit}명 fraud 재계산`);
  const count = await scanActiveUsersForFraud(limit);
  console.log(`✅ ${count}명 Risk Score 재계산 완료`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
