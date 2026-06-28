import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { lookup } from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "../public");
const OUT_DIR = path.join(PUBLIC, "apt/corner-sample");
const PORT = 3458;

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
      res.writeHead(200, { "Content-Type": lookup(path.extname(filePath)) || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

const server = await servePublic();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 }, deviceScaleFactor: 2 });

await page.goto(`http://127.0.0.1:${PORT}/apt/corner-sample/shape-compare.html`, {
  waitUntil: "networkidle",
  timeout: 120000,
});
await page.waitForFunction(() => window.__SHAPE_COMPARE_READY__ === true, { timeout: 120000 });
await page.waitForTimeout(800);

const out = path.join(OUT_DIR, "shape-compare-sofa-table-rug.png");
await page.screenshot({ path: out, fullPage: true });
console.log("Saved", out);

await browser.close();
server.close();
