import type { PixelFrame } from "@/lib/watermark/decoder/pipeline";

export const MIN_CROP = 96;

export function cropFrame(frame: PixelFrame, x: number, y: number, w: number, h: number): PixelFrame {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const src = ((y + row) * frame.width + x) * 4;
    const dst = row * w * 4;
    data.set(frame.data.subarray(src, src + w * 4), dst);
  }
  return { width: w, height: h, data };
}

function pushCrop(out: PixelFrame[], seen: Set<string>, frame: PixelFrame, w: number, h: number) {
  const width = Math.min(frame.width, Math.max(MIN_CROP, w));
  const height = Math.min(frame.height, Math.max(MIN_CROP, h));
  const key = `${width}x${height}`;
  if (seen.has(key)) return;
  seen.add(key);
  if (width >= frame.width && height >= frame.height) return;
  const x = Math.max(0, Math.round((frame.width - width) / 2));
  const y = Math.max(0, Math.round((frame.height - height) / 2));
  out.push(cropFrame(frame, x, y, width, height));
}

/**
 * Full-screen OS screenshots often include browser chrome; the watermarked
 * media sits in a centered inset. Try several center crops before giving up.
 */
export function centerCropVariants(frame: PixelFrame): PixelFrame[] {
  const { width, height } = frame;
  const out: PixelFrame[] = [frame];
  const seen = new Set<string>([`${width}x${height}`]);

  const scales = [0.85, 0.72, 0.65, 0.55, 0.48, 0.45, 0.42, 0.38, 0.32];
  for (const sx of scales) {
    for (const sy of scales) {
      pushCrop(out, seen, frame, Math.round(width * sx), Math.round(height * sy));
    }
  }

  const aspects: [number, number][] = [
    [16, 9],
    [4, 3],
    [3, 4],
    [1, 1],
    [9, 16],
  ];
  for (const cover of [0.35, 0.42, 0.5, 0.58, 0.65, 0.75, 0.85]) {
    for (const [aw, ah] of aspects) {
      const aspect = aw / ah;
      let w = Math.round(width * cover);
      let h = Math.round(w / aspect);
      if (h > height * cover) {
        h = Math.round(height * cover);
        w = Math.round(h * aspect);
      }
      pushCrop(out, seen, frame, w, h);
    }
  }

  const step = Math.max(12, Math.floor(width / 48));
  for (let w = MIN_CROP; w <= width; w += step) {
    for (const aspect of [16 / 9, 4 / 3, 3 / 4, 1, 9 / 16]) {
      const h = Math.round(w / aspect);
      if (h < MIN_CROP || h > height) continue;
      pushCrop(out, seen, frame, w, h);
    }
  }

  return out;
}

const FAST_SCALE_FACTORS = [1.25, 1.5] as const;

function scaleFrameTo(frame: PixelFrame, scale: number): PixelFrame | null {
  const width = Math.max(MIN_CROP, Math.round(frame.width * scale));
  const height = Math.max(MIN_CROP, Math.round(frame.height * scale));
  if (width === frame.width && height === frame.height) return null;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = ((y + 0.5) / height) * frame.height - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(frame.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = ((x + 0.5) / width) * frame.width - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(frame.width - 1, x0 + 1);
      const fx = sx - x0;
      const dst = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v00 = frame.data[(y0 * frame.width + x0) * 4 + c];
        const v10 = frame.data[(y0 * frame.width + x1) * 4 + c];
        const v01 = frame.data[(y1 * frame.width + x0) * 4 + c];
        const v11 = frame.data[(y1 * frame.width + x1) * 4 + c];
        const v0 = v00 * (1 - fx) + v10 * fx;
        const v1 = v01 * (1 - fx) + v11 * fx;
        data[dst + c] = Math.round(v0 * (1 - fy) + v1 * fy);
      }
      data[dst + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Few upscale variants for creator-scoped admin fast path. */
export function scaleFrameVariantsFast(frame: PixelFrame): PixelFrame[] {
  const out: PixelFrame[] = [];
  for (const scale of FAST_SCALE_FACTORS) {
    const scaled = scaleFrameTo(frame, scale);
    if (scaled) out.push(scaled);
  }
  return out;
}

/** Few center crops for lightbox-style full-screen screenshots. */
export function centerCropVariantsFast(frame: PixelFrame): PixelFrame[] {
  const { width, height } = frame;
  const out: PixelFrame[] = [frame];
  const seen = new Set<string>([`${width}x${height}`]);
  for (const cover of [0.42, 0.55, 0.68, 0.75]) {
    pushCrop(out, seen, frame, Math.round(width * cover), Math.round(height * cover));
  }
  for (const [aw, ah] of [
    [16, 9],
    [4, 3],
  ] as const) {
    const aspect = aw / ah;
    const w = Math.round(width * 0.58);
    const h = Math.round(w / aspect);
    pushCrop(out, seen, frame, w, h);
  }
  return out;
}

/** Upscale variants for captures sampled below embed resolution (screenshots / phone photos). */
export function scaleFrameVariants(frame: PixelFrame): PixelFrame[] {
  const scales = [
    1.05, 1.08, 1.1, 1.12, 1.15, 1.18, 1.2, 1.25, 1.33, 1.42, 1.5, 1.6, 1.75, 2, 2.5, 3,
  ];
  const out: PixelFrame[] = [];
  for (const scale of scales) {
    const scaled = scaleFrameTo(frame, scale);
    if (scaled) out.push(scaled);
  }
  return out;
}
