/**
 * Generate theme-ready notification action PNGs from SVG (reply curved arrow).
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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.warn("[generate-notification-icons] sharp not found — skip PNG generation");
    return;
  }

  const whiteSvg = Buffer.from(replyArrowSvg("#FFFFFF"));
  const blackSvg = Buffer.from(replyArrowSvg("#000000"));

  await sharp(whiteSvg).png().toFile(path.join(OUT, "action-reply.png"));
  await sharp(whiteSvg).png().toFile(path.join(OUT, "action-reply-dark.png"));
  await sharp(blackSvg).png().toFile(path.join(OUT, "action-reply-light.png"));

  console.log("[generate-notification-icons] wrote action-reply PNG variants");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
