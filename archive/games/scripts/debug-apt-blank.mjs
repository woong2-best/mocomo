/**
 * APT blank screen diagnostic — DOM + screenshot
 * Usage: node scripts/debug-apt-blank.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const outDir = path.join(__dirname, "../public/apt/_diag");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ko-KR",
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`PAGE: ${err.message}`));

await page.addInitScript(() => {
  try {
    localStorage.setItem("apt-first-impression-v1", "1");
  } catch {}
});

await page.goto(`${baseUrl}/apt`, { waitUntil: "networkidle", timeout: 120000 });

// Enter home if landing overlay visible
const enterBtn = page.getByRole("button", { name: /내 집으로 입장|내 공간/ });
if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await enterBtn.click();
  await page.waitForTimeout(2000);
}

await page.waitForTimeout(3000);

const diag = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => document.querySelectorAll(sel);
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, top: r.top, left: r.left };
  };
  const cs = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return { display: s.display, opacity: s.opacity, visibility: s.visibility, zIndex: s.zIndex };
  };

  const roomCanvas = q('[data-testid="room-canvas"]');
  const dollhouse = q(".dollhouse-canvas-root");
  const overview = q(".apt-game-overview");
  const roomBg = q(".apt-game-room-bg");
  const stickers = qa('[data-testid^="sticker-"]');
  const stickerImgs = qa('[data-testid^="sticker-"] img, .apt-bondee-sticker img');
  const backdropImg = q('.apt-game-room-canvas img[alt="방 배경"]');
  const hud = q(".apt-game-hud");
  const nav = q(".apt-game-nav");
  const firstEntry = q(".apt-first-entry-layer");
  const buildStamp = q(".font-mono");

  return {
    url: location.href,
    roomCanvas: { exists: !!roomCanvas, rect: rect(roomCanvas), style: cs(roomCanvas) },
    dollhouse: { exists: !!dollhouse, rect: rect(dollhouse), style: cs(dollhouse) },
    overview: {
      exists: !!overview,
      rect: rect(overview),
      style: cs(overview),
    },
    roomBg: { exists: !!roomBg, rect: rect(roomBg), style: cs(roomBg) },
    stickerCount: stickers.length,
    stickerImgCount: stickerImgs.length,
    backdropImg: backdropImg
      ? { src: backdropImg.getAttribute("src"), complete: backdropImg.complete, naturalW: backdropImg.naturalWidth }
      : null,
    hud: { exists: !!hud, visible: hud ? cs(hud) : null },
    nav: { exists: !!nav },
    firstEntry: { exists: !!firstEntry, style: cs(firstEntry) },
    buildStamp: buildStamp?.textContent?.trim() ?? null,
    bodySize: rect(document.body),
    mainSize: rect(q("main")),
  };
});

const tag = baseUrl.includes("mocomo.net") ? "prod" : "local";
const shotPath = path.join(outDir, `apt-blank-${tag}.png`);
await page.screenshot({ path: shotPath, fullPage: false });

console.log(JSON.stringify({ baseUrl, diag, consoleErrors: consoleErrors.slice(0, 20) }, null, 2));
console.log("Screenshot:", shotPath);

await browser.close();
