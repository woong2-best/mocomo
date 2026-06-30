#!/usr/bin/env node
/**
 * 프로덕션 헬스 체크 — CI·배포 후 검증
 * PERSONA_BASE_URL=https://mocomo.net node scripts/prod-health-check.mjs
 */
const BASE = (process.env.PERSONA_BASE_URL || "https://mocomo.net").replace(/\/$/, "");

const ENDPOINTS = [
  { name: "health", path: "/api/health", critical: true },
  { name: "health-summary", path: "/api/health/summary", critical: false },
  { name: "health-socket", path: "/api/health/socket", critical: false },
  { name: "health-payments", path: "/api/health/payments", critical: false },
  { name: "feed", path: "/api/feed?limit=1", critical: false },
];

async function check({ name, path, critical }) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const ok = res.ok;
    console.log(`${ok ? "✓" : "✗"} ${name} ${res.status} ${url}`);
    return { name, ok, critical };
  } catch (e) {
    console.log(`✗ ${name} FAIL ${url}`);
    return { name, ok: false, critical, error: String(e) };
  }
}

async function main() {
  console.log(`Health check: ${BASE}\n`);
  const results = await Promise.all(ENDPOINTS.map(check));
  const criticalFail = results.some((r) => r.critical && !r.ok);
  const anyFail = results.some((r) => !r.ok);
  console.log(`\n${criticalFail ? "CRITICAL FAIL" : anyFail ? "WARN" : "ALL OK"}`);
  process.exit(criticalFail ? 1 : 0);
}

main();
