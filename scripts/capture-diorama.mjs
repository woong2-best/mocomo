import { chromium, devices } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mode = process.argv[2] || "mobile";
const baseUrl = process.argv[3] || "http://127.0.0.1:3456";

const profiles = {
  mobile: {
    url: `${baseUrl}/diorama/mobile-preview.html`,
    out: path.join(__dirname, "../public/diorama/screenshot-mobile.png"),
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    url: `${baseUrl}/diorama/preview.html`,
    out: path.join(__dirname, "../public/diorama/screenshot-current.png"),
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
};

const profile = profiles[mode] ?? profiles.mobile;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: profile.viewport,
  deviceScaleFactor: profile.deviceScaleFactor,
  isMobile: profile.isMobile,
  hasTouch: profile.hasTouch,
  userAgent: profile.isMobile
    ? devices["iPhone 13"].userAgent
    : undefined,
});
const page = await context.newPage();
await page.goto(profile.url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("#stickers .sticker img", { timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: profile.out, fullPage: false });
await browser.close();
console.log(`Saved ${mode}:`, profile.out);
