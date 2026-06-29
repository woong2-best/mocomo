export type GateStatus = "PASS" | "WARN" | "FAIL";

export type GateResult = {
  name: string;
  status: GateStatus;
  value: number | string;
  threshold: string;
  detail?: string;
};

export type GateInput = {
  negativeGold: number;
  duplicateMarketBuys: number;
  storageMismatch: number;
  notificationLoss: number;
  replayErrors: number;
  fraudMissed: number;
  deadlocks: number;
  p95Ms: number;
  errorPct: number;
};

const P95_WARN = 3000;
const P95_FAIL = 8000;
const ERROR_WARN = 2;
const ERROR_FAIL = 10;
const DEADLOCK_WARN = 3;
const DEADLOCK_FAIL = 20;

function gateCount(
  name: string,
  value: number,
  failAt: number,
  warnAt?: number
): GateResult {
  if (value > failAt) {
    return { name, status: "FAIL", value, threshold: `≤ ${failAt}` };
  }
  if (warnAt != null && value > warnAt) {
    return { name, status: "WARN", value, threshold: `≤ ${warnAt}` };
  }
  return { name, status: "PASS", value, threshold: `≤ ${failAt}` };
}

export function evaluateStressGate(input: GateInput): GateResult[] {
  return [
    gateCount("Wallet 음수", input.negativeGold, 0),
    gateCount("중복 구매", input.duplicateMarketBuys, 0),
    gateCount("Storage mismatch", input.storageMismatch, 0),
    gateCount("Notification 유실", input.notificationLoss, 0),
    gateCount("Replay 오류", input.replayErrors, 0),
    gateCount("Fraud 미감지", input.fraudMissed, 0, 0),
    gateCount("Deadlock", input.deadlocks, DEADLOCK_FAIL, DEADLOCK_WARN),
    {
      name: "P95 latency (ms)",
      status:
        input.p95Ms > P95_FAIL ? "FAIL" : input.p95Ms > P95_WARN ? "WARN" : "PASS",
      value: input.p95Ms,
      threshold: `≤ ${P95_WARN} (WARN) / ≤ ${P95_FAIL} (FAIL)`,
    },
    {
      name: "Error %",
      status:
        input.errorPct > ERROR_FAIL ? "FAIL" : input.errorPct > ERROR_WARN ? "WARN" : "PASS",
      value: `${input.errorPct}%`,
      threshold: `≤ ${ERROR_WARN}% (WARN) / ≤ ${ERROR_FAIL}% (FAIL)`,
    },
  ];
}

export function overallGateStatus(
  results: GateResult[],
  opts?: { strictPerf?: boolean }
): GateStatus {
  const perfNames = new Set(["P95 latency (ms)", "Error %"]);
  const critical = results.filter((r) => !perfNames.has(r.name));
  const perf = results.filter((r) => perfNames.has(r.name));

  if (critical.some((r) => r.status === "FAIL")) return "FAIL";
  if (opts?.strictPerf) {
    if (results.some((r) => r.status === "FAIL")) return "FAIL";
  } else {
    const perfFail = perf.some((r) => r.status === "FAIL");
    if (perfFail) return "WARN";
  }
  if (results.some((r) => r.status === "WARN")) return "WARN";
  return "PASS";
}

export function printGateReport(results: GateResult[], opts?: { strictPerf?: boolean }) {
  const overall = overallGateStatus(results, opts);
  console.log("\n" + "═".repeat(52));
  console.log(" QA GATE: " + overall);
  console.log("═".repeat(52));
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} [${r.status}] ${r.name}: ${r.value} (기준 ${r.threshold})`);
  }
  console.log("═".repeat(52));
}

export function printMetricsReport(
  label: string,
  m: ReturnType<import("./stress-metrics").StressMetrics["snapshot"]>
) {
  console.log(`\n── ${label} ──`);
  console.log(`  TPS: ${m.tps} | P95: ${m.p95}ms | P99: ${m.p99}ms | Avg: ${m.avgMs}ms`);
  console.log(
    `  Ops: ${m.total} (ok ${m.successes} / err ${m.errors}) | Error: ${m.errorPct}% | Deadlock: ${m.deadlocks}`
  );
}
