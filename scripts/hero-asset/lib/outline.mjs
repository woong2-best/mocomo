import sharp from "sharp";

/** Extract 1px outline from RGBA/grayscale image buffer */
export async function extractOutline(pngBuffer, opts = {}) {
  const threshold = opts.threshold ?? 200;
  const { data, info } = await sharp(pngBuffer).ensureAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const mask = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    mask[i] = data[i] < threshold ? 1 : 0;
  }

  const outline = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const neighbors =
        mask[i - 1] + mask[i + 1] + mask[i - w] + mask[i + w] + mask[i - w - 1] + mask[i - w + 1] + mask[i + w - 1] + mask[i + w + 1];
      if (neighbors < 8) outline[i] = 1;
    }
  }

  const color = opts.color ?? { r: 255, g: 255, b: 255 };
  const out = Buffer.alloc(w * h * 4, 0);
  for (let i = 0; i < outline.length; i++) {
    if (!outline[i]) continue;
    const o = i * 4;
    out[o] = color.r;
    out[o + 1] = color.g;
    out[o + 2] = color.b;
    out[o + 3] = 255;
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

export async function resizeToSquare(pngBuffer, size = 512, bg = "#EBE4D8") {
  return sharp(pngBuffer).resize(size, size, { fit: "contain", background: bg }).png().toBuffer();
}

/** Color-coded diff: red=reference only, blue=model only, white=both */
export async function diffVisualization(refOutlineBuf, modelOutlineBuf, size = 512) {
  const ref = await sharp(refOutlineBuf).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer();
  const mod = await sharp(modelOutlineBuf).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer();

  const out = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const rHit = ref[o + 3] > 20;
    const mHit = mod[o + 3] > 20;
    const p = i * 3;
    if (rHit && mHit) {
      out[p] = 220;
      out[p + 1] = 220;
      out[p + 2] = 220;
    } else if (rHit) {
      out[p] = 255;
      out[p + 1] = 50;
      out[p + 2] = 50;
    } else if (mHit) {
      out[p] = 50;
      out[p + 1] = 100;
      out[p + 2] = 255;
    } else {
      out[p] = 235;
      out[p + 1] = 228;
      out[p + 2] = 216;
    }
  }

  return sharp(out, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

export async function outlineOverlay(refOutlineBuf, modelOutlineBuf, size = 512) {
  const bg = await sharp({
    create: { width: size, height: size, channels: 3, background: "#EBE4D8" },
  })
    .png()
    .toBuffer();

  const refSized = await sharp(refOutlineBuf).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const modSized = await sharp(modelOutlineBuf).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  return sharp(bg)
    .composite([
      { input: refSized, blend: "over" },
      { input: modSized, blend: "over" },
    ])
    .png()
    .toBuffer();
}
