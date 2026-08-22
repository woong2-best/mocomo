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
