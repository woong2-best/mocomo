import { chromium, devices } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || "https://mocomo.net/apt";
const out = path.join(__dirname, "../public/diorama/screenshot-apt-mobile.png");

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  locale: "ko-KR",
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log("Saved:", out);
