/**
 * Lightbox display gate: opaque overlay hides canvas until ready signal.
 * Run: node scripts/forensic-lightbox-overlay-playwright.mjs
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.setContent(`
    <div id="stage" style="position:relative;width:800px;height:592px;background:#000">
      <div id="canvasHost" style="position:relative;z-index:2;display:flex;height:100%;width:100%;align-items:center;justify-content:center">
        <canvas id="canvas" width="640" height="480" style="display:block;width:640px;height:480px"></canvas>
      </div>
      <div id="overlay" style="position:absolute;inset:0;z-index:10;background:#000;display:flex;align-items:center;justify-content:center">loading</div>
    </div>
  `);

  await page.evaluate(() => {
    const canvas = document.getElementById("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("no canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.fillStyle = "#4488cc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "32px sans-serif";
    ctx.fillText("READY", 260, 250);
  });

  const hidden = await page.evaluate(() => {
    const canvas = document.getElementById("canvas");
    const overlay = document.getElementById("overlay");
    if (!(canvas instanceof HTMLCanvasElement) || !overlay) return null;
    const canvasRect = canvas.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    return {
      canvasW: canvasRect.width,
      canvasH: canvasRect.height,
      overlayCovers: overlayRect.width >= canvasRect.width && overlayRect.height >= canvasRect.height,
    };
  });

  await page.evaluate(() => {
    document.getElementById("overlay")?.remove();
  });

  const visible = await page.evaluate(() => {
    const canvas = document.getElementById("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const sample = ctx?.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return {
      w: rect.width,
      h: rect.height,
      r: sample?.[0],
      g: sample?.[1],
      b: sample?.[2],
    };
  });

  await browser.close();

  if (!hidden?.overlayCovers || hidden.canvasW < 320) {
    console.error("FAIL overlay setup", hidden);
    process.exit(1);
  }
  if (!visible || visible.w < 320 || visible.r !== 68) {
    console.error("FAIL canvas not visible after overlay removal", visible);
    process.exit(1);
  }
  console.log("PASS lightbox overlay reveal", { hidden, visible });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
