/**
 * Persona 1 웹 스모크 — 주요 라우트 스크린샷 (비로그인·공개 화면)
 * PERSONA_BASE_URL=https://mocomo.net node scripts/persona1-smoke.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PERSONA_BASE_URL ?? "https://mocomo.net";
const OUT = path.join("docs", "sprint2-audit", "web");

const ROUTES = [
  { name: "01-explore", path: "/explore" },
  { name: "02-play-house", path: "/play/house" },
  { name: "03-live", path: "/live" },
  { name: "04-live-voice", path: "/live?mode=voice" },
  { name: "05-notifications", path: "/notifications" },
  { name: "06-auth-signin", path: "/auth/signin" },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    locale: "ko-KR",
  });
  const page = await context.newPage();

  const manifest = { base: BASE, capturedAt: new Date().toISOString(), shots: [] };

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    const file = `${route.name}.png`;
    const outPath = path.join(OUT, file);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: outPath, fullPage: false });
      manifest.shots.push({ route: route.path, file, ok: true });
      console.log(`✓ ${route.name}`);
    } catch (e) {
      manifest.shots.push({
        route: route.path,
        file,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      console.warn(`✗ ${route.name}:`, e instanceof Error ? e.message : e);
    }
  }

  fs.writeFileSync(path.join(OUT, "persona1-manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.shots.filter((s) => s.ok).length;
  console.log(`\nDone: ${ok}/${ROUTES.length} → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
