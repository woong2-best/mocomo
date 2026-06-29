/**
 * Sprint 2 audit — 공개 화면 스크린샷 30+ (모바일·태블릿·데스크톱)
 * PERSONA_BASE_URL=https://mocomo.net npm run persona:smoke
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PERSONA_BASE_URL ?? "https://mocomo.net";
const OUT = path.join("docs", "sprint2-audit", "web");

const MOBILE_ROUTES = [
  { name: "01-explore", path: "/explore" },
  { name: "02-play-house", path: "/play/house" },
  { name: "03-live", path: "/live" },
  { name: "04-live-voice", path: "/live?mode=voice" },
  { name: "05-notifications", path: "/notifications" },
  { name: "06-auth-signin", path: "/auth/signin" },
  { name: "07-auth-signup", path: "/auth/signup" },
  { name: "08-feed", path: "/feed" },
  { name: "09-discover", path: "/discover" },
  { name: "10-wallet", path: "/wallet" },
  { name: "11-messages", path: "/messages" },
  { name: "12-games", path: "/games" },
  { name: "13-voice-new", path: "/voice/new" },
  { name: "14-voice-new-voice", path: "/voice/new?mode=voice" },
  { name: "15-compose", path: "/compose" },
  { name: "16-support", path: "/support" },
  { name: "17-legal-terms", path: "/legal/terms" },
  { name: "18-home", path: "/" },
  { name: "19-anime", path: "/anime" },
  { name: "20-used", path: "/used" },
  { name: "21-events", path: "/events" },
  { name: "22-sketch-quiz", path: "/sketch-quiz" },
  { name: "23-play-house-shop", path: "/play/house?shop=official" },
  { name: "24-play-house-market", path: "/play/house?shop=market" },
];

const TABLET_ROUTES = [
  { name: "25-tablet-explore", path: "/explore" },
  { name: "26-tablet-play-house", path: "/play/house" },
  { name: "27-tablet-live", path: "/live" },
];

const DESKTOP_ROUTES = [
  { name: "28-desktop-explore", path: "/explore" },
  { name: "29-desktop-play-house", path: "/play/house" },
  { name: "30-desktop-live", path: "/live" },
  { name: "31-desktop-feed", path: "/feed" },
  { name: "32-desktop-games", path: "/games" },
];

async function captureSet(browser, routes, contextOptions, label) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const shots = [];

  for (const route of routes) {
    const url = `${BASE}${route.path}`;
    const file = `${route.name}.png`;
    const outPath = path.join(OUT, file);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: outPath, fullPage: false });
      shots.push({ route: route.path, file, ok: true, viewport: label });
      console.log(`✓ [${label}] ${route.name}`);
    } catch (e) {
      shots.push({
        route: route.path,
        file,
        ok: false,
        viewport: label,
        error: e instanceof Error ? e.message : String(e),
      });
      console.warn(`✗ [${label}] ${route.name}`);
    }
  }

  await context.close();
  return shots;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const manifest = {
    base: BASE,
    capturedAt: new Date().toISOString(),
    shots: [],
  };

  manifest.shots.push(
    ...(await captureSet(browser, MOBILE_ROUTES, {
      ...devices["iPhone 13"],
      locale: "ko-KR",
    }, "mobile")),
    ...(await captureSet(browser, TABLET_ROUTES, {
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      isMobile: true,
      locale: "ko-KR",
    }, "tablet")),
    ...(await captureSet(browser, DESKTOP_ROUTES, {
      viewport: { width: 1280, height: 800 },
      locale: "ko-KR",
    }, "desktop"))
  );

  fs.writeFileSync(path.join(OUT, "persona1-manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.shots.filter((s) => s.ok).length;
  console.log(`\nDone: ${ok}/${manifest.shots.length} → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
