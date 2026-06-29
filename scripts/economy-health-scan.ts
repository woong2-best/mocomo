/**
 * Economy Health Monitor 주기 스캔
 * npx tsx scripts/economy-health-scan.ts
 */
import "./lib/economy-script-env";
import { runHealthMonitorCycle } from "../src/lib/apt/economy/health/health-monitor-service";

async function main() {
  const dash = await runHealthMonitorCycle();
  console.log(
    `✅ Health: ${dash.overallScore}/100 (${dash.overallLevel}) · Open alerts: ${dash.alerts.filter((a) => a.status === "OPEN").length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
