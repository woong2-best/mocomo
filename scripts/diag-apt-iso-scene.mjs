/**
 * /apt IsoGameScene diagnostic — console, canvas, camera, scene graph
 * Usage: node scripts/diag-apt-iso-scene.mjs [baseUrl]
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "https://mocomo.net";
const OUT = path.join(__dirname, "../public/apt/_diag");

const logs = { console: [], pageErrors: [], networkErrors: [] };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: "ko-KR",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    logs.console.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    logs.pageErrors.push(String(err.message || err));
  });
  page.on("requestfailed", (req) => {
    logs.networkErrors.push(`${req.failure()?.errorText} ${req.url()}`);
  });

  await page.goto(`${BASE}/apt`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);

  // Try to enter interior + furniture edit (best-effort without login)
  const playBtn = page.locator('button:has-text("Play"), button[aria-label*="Play"], .apt-game-play-fab button').first();
  if (await playBtn.count()) {
    await playBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  const enterHome = page.locator('button:has-text("집"), button:has-text("입주"), button:has-text("홈으로")').first();
  if (await enterHome.count()) {
    await enterHome.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  const furnitureTab = page.locator('button:has-text("가구")').first();
  if (await furnitureTab.count()) {
    await furnitureTab.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }

  const dom = await page.evaluate(() => {
    const canvas = document.querySelector(".iso-canvas-root canvas, canvas");
    const canvasRect = canvas?.getBoundingClientRect();
    const stickerRoom = document.querySelector('[data-testid="room-canvas"]');
    const isoRoot = document.querySelector(".iso-canvas-root");
    return {
      url: location.href,
      isoRoot: !!isoRoot,
      isoRootHtml: isoRoot?.outerHTML?.slice(0, 200) ?? null,
      canvasCount: document.querySelectorAll("canvas").length,
      canvasSize: canvasRect
        ? { w: canvasRect.width, h: canvasRect.height, top: canvasRect.top }
        : null,
      stickerRoom: !!stickerRoom,
      roomHeader: document.body.innerText.includes("거실"),
      editSave: document.body.innerText.includes("저장"),
      bodySnippet: document.body.innerText.slice(0, 400),
    };
  });

  // Inject Three.js scene probe if R3F canvas exists
  const r3fProbe = await page.evaluate(() => {
    return new Promise((resolve) => {
      const canvas = document.querySelector(".iso-canvas-root canvas");
      if (!canvas) {
        resolve({ error: "no iso canvas element" });
        return;
      }
      const r = canvas.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        resolve({ error: "canvas zero size", rect: { w: r.width, h: r.height } });
        return;
      }

      // R3F stores root on canvas __r3f
      const root = canvas.__r3f?.root ?? canvas._r3f?.root;
      if (!root) {
        resolve({
          canvasRect: { w: r.width, h: r.height },
          r3f: false,
          webgl: !!(canvas.getContext("webgl") || canvas.getContext("webgl2")),
        });
        return;
      }

      try {
        const state = root.getState?.();
        const cam = state?.camera;
        const scene = state?.scene;
        const camReport = cam
          ? {
              type: cam.type,
              position: cam.position?.toArray?.(),
              left: cam.left,
              right: cam.right,
              top: cam.top,
              bottom: cam.bottom,
              near: cam.near,
              far: cam.far,
              zoom: cam.zoom,
            }
          : null;
        let meshCount = 0;
        let childNames = [];
        scene?.traverse?.((o) => {
          if (o.isMesh) meshCount += 1;
        });
        if (scene?.children) {
          childNames = scene.children.slice(0, 12).map((c) => c.name || c.type);
        }
        resolve({
          canvasRect: { w: r.width, h: r.height },
          r3f: true,
          camReport,
          sceneChildren: scene?.children?.length ?? 0,
          meshCount,
          childNames,
        });
      } catch (e) {
        resolve({ error: String(e), canvasRect: { w: r.width, h: r.height } });
      }
    });
  });

  await page.screenshot({
    path: path.join(OUT, "apt-diag-screenshot.png"),
    fullPage: false,
  });

  const report = {
    base: BASE,
    at: new Date().toISOString(),
    dom,
    r3fProbe,
    logs,
  };

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
