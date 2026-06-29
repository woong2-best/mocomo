/**
 * 로그인 Persona 스크린샷 — 세션 쿠키 필요
 *
 * 1. mocomo.net 로그인 → DevTools → Application → Cookies
 * 2. authjs.session-token (또는 __Secure-authjs.session-token) 값 복사
 * 3. 실행:
 *    PERSONA_BASE_URL=https://mocomo.net ^
 *    PERSONA_SESSION_COOKIE="authjs.session-token=..." ^
 *    npm run persona:auth-smoke
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PERSONA_BASE_URL ?? "https://mocomo.net";
const COOKIE_RAW = process.env.PERSONA_SESSION_COOKIE?.trim();
const OUT = path.join("docs", "sprint2-audit", "web", "auth");

const ROUTES = [
  { name: "auth-01-play-house", path: "/play/house" },
  { name: "auth-02-play-edit", path: "/play/house" },
  { name: "auth-03-shop-official", path: "/play/house?shop=official" },
  { name: "auth-04-shop-market", path: "/play/house?shop=market" },
  { name: "auth-05-notifications", path: "/notifications" },
  { name: "auth-06-wallet", path: "/wallet" },
  { name: "auth-07-settings-profile", path: "/settings/profile" },
  { name: "auth-08-messages", path: "/messages" },
];

function parseCookie(raw, baseUrl) {
  const host = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith("https");
  if (raw.includes("=")) {
    const eq = raw.indexOf("=");
    const name = raw.slice(0, eq).trim();
    const value = raw.slice(eq + 1).trim();
    return { name, value, domain: host, path: "/", secure, httpOnly: true, sameSite: "Lax" };
  }
  return {
    name: secure ? "__Secure-authjs.session-token" : "authjs.session-token",
    value: raw,
    domain: host,
    path: "/",
    secure,
    httpOnly: true,
    sameSite: "Lax",
  };
}

async function main() {
  if (!COOKIE_RAW) {
    console.error("PERSONA_SESSION_COOKIE 환경 변수가 필요합니다.");
    console.error('예: PERSONA_SESSION_COOKIE="authjs.session-token=eyJ..." npm run persona:auth-smoke');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "ko-KR",
  });
  await context.addCookies([parseCookie(COOKIE_RAW, BASE)]);
  const page = await context.newPage();
  const manifest = { base: BASE, capturedAt: new Date().toISOString(), shots: [] };

  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    const file = `${route.name}.png`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(3000);
      if (route.name === "auth-02-play-edit") {
        const editBtn = page.getByRole("button", { name: /가구|편집|furniture/i }).first();
        if (await editBtn.isVisible().catch(() => false)) {
          await editBtn.click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }
      await page.screenshot({ path: path.join(OUT, file), fullPage: false });
      manifest.shots.push({ route: route.path, file, ok: true });
      console.log(`✓ ${route.name}`);
    } catch (e) {
      manifest.shots.push({
        route: route.path,
        file,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      console.warn(`✗ ${route.name}`);
    }
  }

  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.shots.filter((s) => s.ok).length;
  console.log(`\nDone: ${ok}/${ROUTES.length} → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
