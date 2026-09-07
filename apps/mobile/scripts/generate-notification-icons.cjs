/**
 * Generate theme-ready notification action PNGs from SVG.
 * iOS template icons: white stroke on transparent.
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../assets/notifications");

function replyArrowSvg(stroke) {
  return `<svg width="128" height="128" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"
        fill="none" stroke="${stroke}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function heartSvg(stroke) {
  return `<svg width="128" height="128" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 21s-6.7-4.35-9.2-8.1C.8 9.6 2.1 5.8 5.8 5.1c1.9-.4 3.7.5 4.7 2 1-1.5 2.8-2.4 4.7-2 3.7.7 5 4.5 2.9 7.8C18.7 16.65 12 21 12 21z"
        fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
}

function starSvg(stroke) {
  return `<svg width="128" height="128" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 3.5l2.6 5.8 6.3.5-4.8 4 1.5 6.1L12 17.8 6.4 20l1.5-6.1-4.8-4 6.3-.5L12 3.5z"
        fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
</svg>`;
}

async function writePng(sharp, svg, filename) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, filename));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.warn("[generate-notification-icons] sharp not found — skip PNG generation");
    return;
  }

  await writePng(sharp, replyArrowSvg("#FFFFFF"), "action-reply.png");
  await writePng(sharp, replyArrowSvg("#FFFFFF"), "action-reply-dark.png");
  await writePng(sharp, replyArrowSvg("#000000"), "action-reply-light.png");
  await writePng(sharp, heartSvg("#FFFFFF"), "action-heart.png");
  await writePng(sharp, starSvg("#FFFFFF"), "action-star.png");

  console.log("[generate-notification-icons] wrote notification action PNGs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
