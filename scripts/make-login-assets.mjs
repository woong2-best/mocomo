import sharp from "sharp";

const ASSETS = "C:/Users/백권웅/.cursor/projects/c-dev-mocomo/assets";
const OUT = "apps/mobile/assets";

/**
 * The supplied hero is 472x1024 — well under a phone's pixel width, so upscale
 * with lanczos and sharpen, then deepen the colours as requested.
 */
async function buildBackground() {
  const src = `${ASSETS}/c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_1412-1d79940b-3f1f-4f52-a12f-fa1d34ca5054.png`;
  const dest = `${OUT}/welcome-bg.png`;

  await sharp(src)
    .resize({ width: 1180, kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 2.2 })
    // Deepen the navy without dulling the white line art: the linear curve
    // crushes the shadows while highlights still clip to pure white.
    .modulate({ saturation: 1.45 })
    .linear(1.12, -30)
    .png({ compressionLevel: 9 })
    .toFile(dest);

  const m = await sharp(dest).metadata();
  console.log(`${dest} -> ${m.width}x${m.height}`);
}

async function buildLineLogo() {
  const src = `${ASSETS}/c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_BLneGDukOQQqC457guy9Rz7fjf1VDCWa9gYEsGw23-KmGJdBx10cT7mV1NbKFRV2PizOgWji1DYhRzS5Faf48A-20fb1254-8577-4477-85dd-3713ad29ddf6.png`;
  const dest = `${OUT}/brand-line.png`;

  await sharp(src)
    .trim({ threshold: 1 })
    .resize({ width: 156, height: 156, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);

  const m = await sharp(dest).metadata();
  console.log(`${dest} -> ${m.width}x${m.height}`);
}

await buildBackground();
await buildLineLogo();
