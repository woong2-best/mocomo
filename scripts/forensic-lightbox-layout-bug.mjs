/**
 * Validates fixed findContainBounds ignores spinner stub dimensions.
 * Run: node scripts/forensic-lightbox-layout-bug.mjs
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.setContent(`
    <div id="stage" style="display:flex;height:800px;width:1280px;align-items:center;justify-content:center;padding:64px 48px">
      <div id="outer" style="position:relative;display:inline-flex;height:592px;max-height:592px;max-width:100%;width:100%;align-items:center;justify-content:center">
        <div id="canvasWrap" style="position:relative;display:flex;height:100%;width:100%;max-height:100%;max-width:100%;align-items:center;justify-content:center">
          <div id="wrap" style="position:relative;display:block;height:100%;width:100%;max-height:100%;max-width:100%;overflow:hidden">
            <canvas id="canvas" style="display:block;visibility:hidden;height:100%;width:100%"></canvas>
          </div>
        </div>
        <div id="spinner" style="position:absolute;inset:0;display:flex;min-height:160px;min-width:240px;align-items:center;justify-content:center">...</div>
      </div>
    </div>
  `);

  const bounds = await page.evaluate(async () => {
    const mod = await import("/src/components/media/forensic-canvas-fit.ts").catch(() => null);
    if (mod?.findContainBounds) {
      return mod.findContainBounds(document.getElementById("wrap"));
    }

    const MIN = 320;
    function findContainBounds(wrap) {
      let maxW = Math.min(window.innerWidth, 1920);
      let maxH = Math.min(window.innerHeight, 1080);
      let el = wrap;
      for (let depth = 0; depth < 12 && el; depth += 1) {
        const style = window.getComputedStyle(el);
        for (const [prop, key] of [
          ["maxWidth", "maxW"],
          ["maxHeight", "maxH"],
        ]) {
          const v = style[prop];
          if (v && v !== "none") {
            const px = Number.parseFloat(v);
            if (Number.isFinite(px) && px > 0) {
              if (key === "maxW") maxW = Math.min(maxW, px);
              else maxH = Math.min(maxH, px);
            }
          }
        }
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w >= MIN) maxW = Math.min(maxW, w);
        if (h >= MIN) maxH = Math.min(maxH, h);
        el = el.parentElement;
      }
      const padding = 32;
      return {
        maxW: Math.max(MIN, maxW - padding),
        maxH: Math.max(MIN, maxH - padding),
      };
    }

    const wrap = document.getElementById("wrap");
    return findContainBounds(wrap);
  });

  await browser.close();
  console.log("fixed bounds:", bounds);
  if (bounds.maxH < 320 || bounds.maxW < 320) {
    console.error("FAIL: bounds below verify minimum");
    process.exit(1);
  }
  console.log("PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
