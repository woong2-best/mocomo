import { chromium, devices } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:3001";
const outDir = path.join(__dirname, "../public/apt/_diag");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ko-KR",
});
const page = await context.newPage();

await page.addInitScript(() => {
  try {
    localStorage.setItem("apt-first-impression-v1", "1");
  } catch {}
});

await page.goto(`${baseUrl}/diorama/apt-room-preview`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector('[data-testid="room-canvas"]', { timeout: 60000 });
await page.waitForTimeout(2500);

const diag = await page.evaluate(() => ({
  roomCanvas: !!document.querySelector('[data-testid="room-canvas"]'),
  stickers: document.querySelectorAll('[data-testid^="sticker-"]').length,
  backdrop: document.querySelector('img[alt="방 배경"]')?.naturalWidth ?? 0,
  hud: !!document.querySelector(".apt-game-hud"),
  nav: !!document.querySelector(".apt-game-nav"),
  overview: !!document.querySelector(".apt-game-overview"),
}));

const shot = path.join(outDir, "apt-room-preview-after.png");
await page.screenshot({ path: shot, fullPage: false });
console.log(JSON.stringify({ baseUrl, diag, shot }, null, 2));
await browser.close();
