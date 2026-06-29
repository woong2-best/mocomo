/**
 * IAP Ack/Verify 재시도 큐 처리
 * npx tsx scripts/iap-retry.ts
 */
import "./lib/economy-script-env";
import { processIapRetryQueue } from "../src/lib/apt/economy/iap/iap-retry-service";

async function main() {
  const n = await processIapRetryQueue(50);
  console.log(`✅ IAP retry processed: ${n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
