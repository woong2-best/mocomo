/**
 * Capture Corner Sample screenshot + side-by-side reference comparison.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { lookup } from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../public");
const OUT_DIR = path.join(PUBLIC, "apt/corner-sample");
const PORT = 3457;

function servePublic() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const filePath = path.join(PUBLIC, urlPath === "/" ? "index.html" : urlPath);
      if (!filePath.startsWith(PUBLIC) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const type = lookup(path.extname(filePath)) || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const server = await servePublic();
const base = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});

await page.goto(`${base}/apt/corner-sample/preview.html`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => window.__CORNER_SAMPLE_READY__ === true, { timeout: 120000 });
await page.waitForTimeout(1500);

const currentPath = path.join(OUT_DIR, "screenshot-current.png");
await page.screenshot({ path: currentPath, fullPage: false });
console.log("Saved", currentPath);

const refPath = path.join(PUBLIC, "apt/reference/apt-target-mockup.png");
const comparePath = path.join(OUT_DIR, "screenshot-comparison.png");

await page.setContent(`
<!DOCTYPE html>
<html><head><style>
  body { margin:0; background:#111; display:flex; gap:8px; padding:8px; }
  img { height:784px; width:auto; object-fit:contain; border:2px solid #333; }
  .label { position:absolute; top:16px; color:#fff; font:bold 14px system-ui; }
  .panel { position:relative; }
</style></head><body>
  <div class="panel"><span class="label" style="left:16px">Reference</span>
    <img src="data:image/png;base64,${fs.readFileSync(refPath).toString("base64")}" /></div>
  <div class="panel"><span class="label" style="left:16px">Corner Sample (current)</span>
    <img src="data:image/png;base64,${fs.readFileSync(currentPath).toString("base64")}" /></div>
</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: comparePath, fullPage: false });
console.log("Saved", comparePath);

await browser.close();
server.close();
