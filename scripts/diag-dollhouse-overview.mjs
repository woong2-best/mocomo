/**
 * Dollhouse overview diagnostic — canvas size, mesh count, console errors
 * Usage: node scripts/diag-dollhouse-overview.mjs [baseUrl]
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "https://mocomo.net";
const OUT = path.join(__dirname, "../public/apt/_diag");

const logs = { console: [], pageErrors: [] };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  page.on("console", (msg) => logs.console.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => logs.pageErrors.push(String(err.message || err)));

  await page.goto(`${BASE}/apt`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(3000);

  const dom = await page.evaluate(() => {
    const root = document.querySelector(".dollhouse-canvas-root");
    const canvas = root?.querySelector("canvas") ?? document.querySelector("canvas");
    const rect = canvas?.getBoundingClientRect();
    const overview = document.querySelector(".apt-game-overview");
    const oRect = overview?.getBoundingClientRect();
    const bg = overview ? getComputedStyle(overview).backgroundColor : null;
    return {
      overview: !!overview,
      overviewSize: oRect ? { w: oRect.width, h: oRect.height } : null,
      overviewBg: bg,
      dollhouseRoot: !!root,
      canvasCount: document.querySelectorAll("canvas").length,
      canvasSize: rect ? { w: rect.width, h: rect.height } : null,
      buildStamp: document.querySelector("[data-apt-build]")?.textContent ?? null,
      hasOverviewLabel: document.body.innerText.includes("빈 집 구조"),
    };
  });

  const probe = await page.evaluate(() => {
    const canvas = document.querySelector(".dollhouse-canvas-root canvas");
    if (!canvas) return { error: "no dollhouse canvas" };
    const r = canvas.getBoundingClientRect();
    const root = canvas.__r3f?.root ?? canvas._r3f?.root;
    if (!root) {
      return {
        canvasRect: { w: r.width, h: r.height },
        r3f: false,
        webgl: !!(canvas.getContext("webgl2") || canvas.getContext("webgl")),
      };
    }
    const state = root.getState?.();
    const scene = state?.scene;
    let meshCount = 0;
    scene?.traverse?.((o) => {
      if (o.isMesh) meshCount += 1;
    });
    const cam = state?.camera;
    return {
      canvasRect: { w: r.width, h: r.height },
      r3f: true,
      meshCount,
      cam: cam
        ? { type: cam.type, pos: cam.position?.toArray?.(), left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom }
        : null,
    };
  });

  await page.screenshot({ path: path.join(OUT, "dollhouse-diag.png"), fullPage: false });

  const report = { base: BASE, at: new Date().toISOString(), dom, probe, logs };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
