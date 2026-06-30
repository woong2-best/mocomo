#!/usr/bin/env node
/**
 * API 스모크 테스트 — 배포 후 빠른 회귀
 * PERSONA_BASE_URL=https://mocomo.net node scripts/smoke-api.mjs
 */
const BASE = (process.env.PERSONA_BASE_URL || "https://mocomo.net").replace(/\/$/, "");

const TESTS = [
  {
    name: "health",
    path: "/api/health",
    assert: (j) => j.status === "ok" || j.status === "degraded",
  },
  {
    name: "health-summary",
    path: "/api/health/summary",
    assert: (j) => typeof j.checks === "object",
  },
  {
    name: "feed-public",
    path: "/api/feed?limit=3",
    assert: (j) => Array.isArray(j.items),
  },
  {
    name: "push-vapid",
    path: "/api/push/vapid",
    assert: (j) => typeof j.configured === "boolean",
  },
  {
    name: "explore-page",
    path: "/explore",
    assert: (_, res) => res.ok && res.headers.get("content-type")?.includes("text/html"),
  },
  {
    name: "feed-page",
    path: "/feed",
    assert: (_, res) => res.ok,
  },
  {
    name: "games-page",
    path: "/games",
    assert: (_, res) => res.ok,
  },
];

async function runTest(test) {
  const url = `${BASE}${test.path}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json, text/html" } });
    const ct = res.headers.get("content-type") || "";
    const json = ct.includes("json") ? await res.json() : null;
    const pass = test.assert(json, res);
    console.log(`${pass ? "✓" : "✗"} ${test.name}`);
    return pass;
  } catch {
    console.log(`✗ ${test.name} (network)`);
    return false;
  }
}

async function main() {
  console.log(`API smoke: ${BASE}\n`);
  const results = await Promise.all(TESTS.map(runTest));
  const failed = results.filter((r) => !r).length;
  console.log(`\n${failed === 0 ? "PASS" : `FAIL (${failed})`}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
