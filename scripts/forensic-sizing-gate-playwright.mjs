/**
 * Browser layout gate — no auth. Run: node scripts/forensic-sizing-gate-playwright.mjs
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.setContent(`
    <div id="outer" style="width:800px;height:400px;max-height:400px;display:flex;align-items:center;justify-content:center">
      <div id="wrap" style="position:relative;overflow:hidden;display:inline-block;max-height:100%;max-width:100%;box-sizing:border-box">
        <canvas id="canvas" style="display:block;visibility:hidden"></canvas>
      </div>
    </div>
  `);

  const clamped = await page.evaluate(() => {
    const wrap = document.getElementById("wrap");
    const canvas = document.getElementById("canvas");
    if (!wrap || !canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("fixture missing");
    }

    function readBox(el) {
      void el.offsetHeight;
      const rect = el.getBoundingClientRect();
      if (rect.width >= 4 && rect.height >= 4) {
        return { w: Math.round(rect.width), h: Math.round(rect.height) };
      }
      if (el.clientWidth >= 4 && el.clientHeight >= 4) {
        return { w: el.clientWidth, h: el.clientHeight };
      }
      return null;
    }

    const cssW = 960;
    const cssH = 720;
    wrap.style.width = `${cssW}px`;
    wrap.style.height = `${cssH}px`;
    wrap.style.maxWidth = "100%";
    wrap.style.maxHeight = "100%";
    canvas.width = cssW;
    canvas.height = cssH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    void wrap.offsetHeight;

    let displayed = readBox(canvas) ?? { w: cssW, h: cssH };
    const wrapBox = readBox(wrap);
    if (wrapBox) {
      const wrapLong = Math.max(wrapBox.w, wrapBox.h);
      const displayLong = Math.max(displayed.w, displayed.h);
      if (wrapLong > 0 && wrapLong < displayLong) {
        displayed = wrapBox;
      }
    }

    wrap.style.width = `${displayed.w}px`;
    wrap.style.height = `${displayed.h}px`;
    canvas.width = displayed.w;
    canvas.height = displayed.h;
    canvas.style.width = `${displayed.w}px`;
    canvas.style.height = `${displayed.h}px`;
    void canvas.offsetHeight;

    const finalCanvas = readBox(canvas) ?? displayed;
    const finalWrap = readBox(wrap) ?? displayed;
    return {
      alignedW: displayed.w,
      alignedH: displayed.h,
      finalCanvasW: finalCanvas.w,
      finalCanvasH: finalCanvas.h,
      finalWrapW: finalWrap.w,
      finalWrapH: finalWrap.h,
    };
  });

  await browser.close();

  const longEdge = Math.max(clamped.finalCanvasW, clamped.finalCanvasH);
  if (longEdge < 320) {
    console.error("FAIL clamped lightbox sizing", clamped);
    process.exit(1);
  }
  if (clamped.alignedH > 410) {
    console.error("FAIL expected aligned height clamp", clamped);
    process.exit(1);
  }
  console.log("PASS clamped lightbox contain sizing", clamped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
