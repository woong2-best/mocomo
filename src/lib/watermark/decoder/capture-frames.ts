import type { PixelFrame } from "@/lib/watermark/decoder/pipeline";
import { MIN_CROP } from "@/lib/watermark/decoder/crop-search";
import { decodeImageToFrame } from "@/lib/watermark/decoder/pipeline";

/** Upscale factors for phone photos of a laptop screen and downscaled screenshots. */
const CAPTURE_UPSCALE_FACTORS = [1.08, 1.12, 1.18, 1.25, 1.33, 1.42, 1.5, 1.75, 2];

const MAX_CAPTURE_FRAMES = 16;

function pushUnique(frames: PixelFrame[], seen: Set<string>, frame: PixelFrame) {
  const key = `${frame.width}x${frame.height}`;
  if (seen.has(key)) return;
  seen.add(key);
  frames.push(frame);
}

/**
 * Expand an uploaded leak (screenshot, phone photo, camera picture of a screen)
 * into several enhanced frames before forensic search.
 */
export async function decodeCaptureFrames(buf: Buffer): Promise<PixelFrame[]> {
  const sharp = (await import("sharp")).default;
  const base = await decodeImageToFrame(buf);
  const frames: PixelFrame[] = [base];
  const seen = new Set<string>([`${base.width}x${base.height}`]);

  for (const factor of CAPTURE_UPSCALE_FACTORS) {
    if (frames.length >= MAX_CAPTURE_FRAMES) break;
    const width = Math.max(MIN_CROP, Math.round(base.width * factor));
    const height = Math.max(MIN_CROP, Math.round(base.height * factor));
    if (width === base.width && height === base.height) continue;

    const { data, info } = await sharp(buf)
      .rotate()
      .resize(width, height, { kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    pushUnique(frames, seen, {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    });
  }

  if (frames.length < MAX_CAPTURE_FRAMES) {
    const { data, info } = await sharp(buf)
      .rotate()
      .sharpen({ sigma: 0.8, m1: 1.1, m2: 0.6 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pushUnique(frames, seen, {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    });
  }

  if (frames.length < MAX_CAPTURE_FRAMES) {
    const { data, info } = await sharp(buf)
      .rotate()
      .normalize()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pushUnique(frames, seen, {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    });
  }

  return frames;
}
