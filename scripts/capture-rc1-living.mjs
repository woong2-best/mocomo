/**
 * RC Sprint 1 — multi-device living room screenshot pass
 * Usage: node scripts/capture-rc1-living.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:3456";
const outDir = path.join(__dirname, "../public/diorama/rc1-screenshots");

const profiles = [
  {
    id: "galaxy-s24",
    label: "Galaxy S24",
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["Galaxy S9+"]?.userAgent,
  },
  {
    id: "iphone-15",
    label: "iPhone 15",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPhone 13"].userAgent,
  },
  {
    id: "galaxy-fold",
    label: "Galaxy Fold (inner)",
    viewport: { width: 673, height: 841 },
    deviceScaleFactor: 2.5,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: "ipad",
    label: "iPad",
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: devices["iPad Pro 11"].userAgent,
  },
  {
    id: "web-desktop",
    label: "Web Desktop",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
];

const url = `${baseUrl}/diorama/mobile-preview.html`;
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const manifest = [];

for (const profile of profiles) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    userAgent: profile.userAgent,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#stickers .sticker img", { timeout: 30000 });
  await page.waitForTimeout(2500);

  const out = path.join(outDir, `rc1-living-${profile.id}.png`);
  await page.screenshot({ path: out, fullPage: false });
  manifest.push({ id: profile.id, label: profile.label, file: path.basename(out) });
  console.log("Saved", profile.label, "→", out);
  await context.close();
}

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  JSON.stringify({ capturedAt: new Date().toISOString(), baseUrl, shots: manifest }, null, 2)
);

await browser.close();
console.log(`RC-1 screenshot pass complete (${manifest.length} devices)`);
