/**
 * Diorama sticker room smoke — same renderer as /apt game room view
 * Usage: node scripts/diag-apt-diorama-smoke.mjs [baseUrl]
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = path.join(__dirname, "../public/apt/_diag");

const logs = { console: [], pageErrors: [] };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  page.on("console", (msg) => {
    if (msg.type() === "error") logs.console.push(msg.text());
  });
  page.on("pageerror", (err) => logs.pageErrors.push(String(err.message || err)));

  await page.goto(`${BASE}/diorama/edit-demo`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);

  const probe = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="room-canvas"]');
    const imgs = document.querySelectorAll('[data-testid="room-canvas"] img, .apt-game-room-canvas img');
    return {
      roomCanvas: !!canvas,
      stickerImgCount: imgs.length,
      bodyHasSofa: document.body.innerText.includes("소파") || imgs.length > 0,
    };
  });

  await page.screenshot({ path: path.join(OUT, "diorama-smoke.png"), fullPage: false });

  console.log(JSON.stringify({ base: BASE, probe, logs }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
