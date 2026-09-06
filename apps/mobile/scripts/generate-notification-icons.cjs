/**
 * Generate theme-ready notification action PNGs from SVG (reply bubble template).
 * iOS template icons: white stroke on transparent.
 */
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../assets/notifications");

function bubbleSvg(stroke) {
  return `<svg width="128" height="128" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 3.75h10a2.75 2.75 0 0 1 2.75 2.75v6.75A2.75 2.75 0 0 1 17 16H11.8L8.2 19.4V16H7A2.75 2.75 0 0 1 4.25 13.25V6.5A2.75 2.75 0 0 1 7 3.75Z"
        fill="none" stroke="${stroke}" stroke-width="1.85" stroke-linejoin="round" stroke-linecap="round"/>
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

  const whiteSvg = Buffer.from(bubbleSvg("#FFFFFF"));
  const blackSvg = Buffer.from(bubbleSvg("#000000"));

  await sharp(whiteSvg).png().toFile(path.join(OUT, "action-reply.png"));
  await sharp(whiteSvg).png().toFile(path.join(OUT, "action-reply-dark.png"));
  await sharp(blackSvg).png().toFile(path.join(OUT, "action-reply-light.png"));

  console.log("[generate-notification-icons] wrote action-reply PNG variants");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
