/**
 * 모바일 편집 모드 전체 플로우 녹화
 * 사용: node scripts/record-edit-mode.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:3457";
const outDir = path.join(__dirname, "../public/diorama");
const videoOut = path.join(outDir, "edit-mode-demo.webm");

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: outDir, size: { width: 390, height: 844 } },
  userAgent: devices["iPhone 13"].userAgent,
});
const page = await context.newPage();
page.setDefaultTimeout(15000);

const log = (msg) => console.log(`[record] ${msg}`);
const wait = (ms) => page.waitForTimeout(ms);

async function touchDrag(locator, dx, dy) {
  const box = await locator.boundingBox();
  if (!box) return;
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(sx + (dx * i) / steps, sy + (dy * i) / steps, { steps: 1 });
    await wait(25);
  }
  await page.mouse.up();
}

let ok = false;
try {
  log("open edit-demo");
  await page.goto(`${baseUrl}/diorama/edit-demo`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector('[data-testid="room-canvas"]', { timeout: 30000 });
  await page.waitForSelector('[data-testid^="sticker-"]', { timeout: 30000 });
  await wait(1500);
  await page.screenshot({ path: path.join(outDir, "edit-step-0-normal.png") });

  log("enter edit mode");
  await page.locator('[data-testid="edit-enter"]').click({ force: true });
  await wait(1000);
  await page.screenshot({ path: path.join(outDir, "edit-step-1-edit-mode.png") });

  log("select remote");
  const target = page.locator('[data-testid="sticker-remote-table"]');
  await target.click({ force: true });
  await wait(600);

  log("drag remote");
  await touchDrag(target, 55, 28);
  await wait(500);
  await target.click({ force: true });
  await wait(400);
  await page.screenshot({ path: path.join(outDir, "edit-step-2-moved.png") });

  log("rotate");
  await page.locator('[data-testid="edit-rotate"]').click({ force: true });
  await wait(500);
  await page.locator('[data-testid="edit-rotate"]').click({ force: true });
  await wait(500);

  log("delete");
  await page.locator('[data-testid="edit-delete"]').click({ force: true });
  await wait(800);
  await page.screenshot({ path: path.join(outDir, "edit-step-3-deleted.png") });

  log("add chair from catalog");
  const catalog = page.locator('[data-testid="catalog-chair"]');
  await catalog.scrollIntoViewIfNeeded();
  await catalog.click({ force: true });
  await wait(600);

  log("place on canvas");
  const canvas = page.locator('[data-testid="room-canvas"]');
  const cb = await canvas.boundingBox();
  if (cb) {
    await page.mouse.click(cb.x + cb.width * 0.5, cb.y + cb.height * 0.55);
  }
  await wait(800);
  await page.screenshot({ path: path.join(outDir, "edit-step-4-placed.png") });

  log("done");
  await page.locator('[data-testid="edit-done"]').click({ force: true });
  await wait(1200);
  await page.screenshot({ path: path.join(outDir, "edit-step-5-saved.png") });
  ok = true;
} catch (err) {
  console.error("Recording failed:", err.message);
}

const video = page.video();
await context.close();
if (video) {
  try {
    await video.saveAs(videoOut);
    console.log(ok ? "Saved video:" : "Saved partial video:", videoOut);
  } catch (e) {
    console.warn("Could not save video:", e.message);
  }
}
await browser.close();

process.exit(ok ? 0 : 1);
