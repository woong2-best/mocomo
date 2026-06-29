/**
 * 매일 04:00 KST 경제 스냅샷 (cron: 0 4 * * * TZ=Asia/Seoul)
 * npx tsx scripts/economy-backup-daily.ts
 */
import "./lib/economy-script-env";
import { createScheduledSnapshot } from "../src/lib/apt/economy/backup/admin-economy-backup-service";

async function main() {
  const snap = await createScheduledSnapshot();
  console.log(`✅ Daily snapshot: ${snap.label} (${snap.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
