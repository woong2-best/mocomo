import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const game = process.argv[3] === "game";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const url = `${baseUrl}/diorama/edit-demo${game ? "?game=1" : ""}`;
await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(4000);

const d = await page.evaluate(() => ({
  roomCanvas: !!document.querySelector('[data-testid="room-canvas"]'),
  stickers: document.querySelectorAll('[data-testid^="sticker-"]').length,
  backdrop: document.querySelector('img[alt="방 배경"]')?.naturalWidth ?? 0,
}));

const tag = game ? "game" : "plain";
const shot = path.join(__dirname, `../public/apt/_diag/edit-demo-${tag}-local.png`);
await page.screenshot({ path: shot, fullPage: false });
console.log(JSON.stringify({ url, d, errors: errors.slice(0, 5), shot }, null, 2));
await browser.close();
