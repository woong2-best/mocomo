import sharp from "sharp";

/**
 * Source art is white line-work on solid black. Convert luminance to alpha so
 * the art sits cleanly on the app's navy background instead of a black box.
 */
async function blackToTransparent(src, dest, maxWidth) {
  const base = sharp(src).removeAlpha();
  const { data, info } = await base
    .clone()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const rgba = Buffer.alloc(px * 4);

  for (let i = 0; i < px; i += 1) {
    const lum = data[i];
    // Lift mid-tones so anti-aliased edges stay visible, clamp near-black to 0.
    const alpha = lum < 18 ? 0 : Math.min(255, Math.round(lum * 1.12));
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = alpha;
  }

  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png()
    .toFile(dest);

  const out = await sharp(dest).metadata();
  console.log(`${dest} -> ${out.width}x${out.height}`);
}

const ASSETS = "C:/Users/백권웅/.cursor/projects/c-dev-mocomo/assets";
const OUT = "apps/mobile/assets";

await blackToTransparent(
  `${ASSETS}/c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_file_000000002c8c8230ba26b381e0c07a9d-0eebc54f-8bf4-4448-ab47-5c3adf9aecad.png`,
  `${OUT}/welcome-mascot.png`,
  600
);

await blackToTransparent(
  `${ASSETS}/c__Users_____AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_Screenshot_20260901_202907_Gallery-11932e2d-8e5f-4f6a-82ae-bb728f3f4bf8.png`,
  `${OUT}/welcome-hands.png`,
  900
);
