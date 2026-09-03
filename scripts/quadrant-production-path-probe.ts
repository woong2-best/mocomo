/**
 * Simulates production path: JPEG origin → canvas draw at display size → embed → verify.
 * Also reports slotsPerBit budget per quadrant (root cause for weak 320×320 signal).
 */
process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import sharp from "sharp";
import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
  WATERMARK_STREAM_BITS,
} from "@/lib/watermark/encoder/spread-spectrum";
import { centralQuadrantRegions } from "@/lib/watermark/encoder/quadrant-encode";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import { verifyWatermarkFrame, quadrantScoresFromResult } from "@/lib/watermark/verify-watermark-frame";
import { REGION_RECOVERED_THRESHOLD } from "@/lib/watermark/decoder/confidence";

const PAIRS_PER_REPEAT = 12;
const REPEATS_PER_BIT = 48 / 12; // 4

function slotsPerBit(region: { w: number; h: number }): number {
  const cellsX = Math.max(1, Math.floor(region.w / 2));
  const cellsY = Math.max(1, region.h);
  const cells = cellsX * cellsY;
  const ideal = PAIRS_PER_REPEAT * REPEATS_PER_BIT;
  return Math.max(1, Math.min(ideal, Math.floor(cells / Math.max(1, WATERMARK_STREAM_BITS))));
}

function reportSlots(w: number, h: number) {
  const regions = centralQuadrantRegions(w, h);
  const slots = regions.map((r) => ({ key: r.key, w: r.w, h: r.h, slots: slotsPerBit(r) }));
  console.log(`${w}x${h} slotsPerBit:`, slots.map((s) => `${s.key}:${s.slots}(${s.w}×${s.h})`).join(" "));
}

type Frame = { width: number; height: number; data: Uint8ClampedArray };

function synthPhoto(w: number, h: number, seed: number): Frame {
  const d = new Uint8ClampedArray(w * h * 4);
  let s = seed >>> 0;
  const r = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // High-contrast portrait-like: bright center-left, dark right, flat skin tones
      const cx = (x - w * 0.35) / (w * 0.25);
      const cy = (y - h * 0.4) / (h * 0.3);
      const face = Math.exp(-(cx * cx + cy * cy));
      const bg = 40 + 25 * r();
      const skin = 180 + 30 * face + 8 * r();
      const b = bg * (1 - face * 0.7) + skin * face * 0.7;
      d[i] = b;
      d[i + 1] = b * 0.92;
      d[i + 2] = b * 0.85;
      d[i + 3] = 255;
    }
  }
  return { width: w, height: h, data: d };
}

async function jpegRoundtrip(img: Frame, quality: number): Promise<Frame> {
  const buf = await sharp(Buffer.from(img.data), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .jpeg({ quality })
    .toBuffer();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

async function scaleDownFromOrigin(originW: number, originH: number, displayW: number, displayH: number, quality: number, seed: number): Promise<Frame> {
  const origin = synthPhoto(originW, originH, seed);
  const jpegOrigin = await jpegRoundtrip(origin, quality);
  const { data, info } = await sharp(Buffer.from(jpegOrigin.data), {
    raw: { width: jpegOrigin.width, height: jpegOrigin.height, channels: 4 },
  })
    .resize(displayW, displayH, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

async function main() {
  const built = buildWatermarkPayload({
    contentId: "m",
    sessionId: "s",
    userId: "u",
    purchaseId: "p",
    watermarkVersion: 1,
    sessionNonce: "n".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "s",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  console.log("REGION_RECOVERED_THRESHOLD =", REGION_RECOVERED_THRESHOLD);
  for (const size of [320, 360, 400, 480, 640, 960]) {
    reportSlots(size, size);
  }

  const verify = (img: Frame, label: string) => {
    const pre = new Uint8ClampedArray(img.data);
    embedInvisibleWatermark(img, config, 0);
    applyCaptureResilienceLayers(img, pre, config, 0);
    const r = verifyWatermarkFrame({
      frame: img,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "m",
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });
    console.log(
      label,
      "pass",
      r.finalPass,
      "recovered",
      r.recoveredCount,
      quadrantScoresFromResult(r),
      r.regionScores.map((x) => `${x.key}:${x.score.toFixed(4)}${x.recovered ? "✓" : "✗"}`).join(" ")
    );
    return r;
  };

  console.log("\n--- production path: 2000px JPEG q92 → 320×320 canvas draw ---");
  for (const seed of [1, 42, 99, 777]) {
    const img = await scaleDownFromOrigin(2000, 2000, 320, 320, 92, seed);
    verify(img, `seed=${seed}`);
  }

  console.log("\n--- MC 200 runs: photo content @ 320×320 (jpeg q92 pre-embed) ---");
  const failByKey: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let pass = 0;
  for (let t = 0; t < 200; t++) {
    const img = await scaleDownFromOrigin(1600, 1200, 320, 320, 92, 1000 + t);
    const pre = new Uint8ClampedArray(img.data);
    embedInvisibleWatermark(img, config, 0);
    applyCaptureResilienceLayers(img, pre, config, 0);
    const r = verifyWatermarkFrame({
      frame: img,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "m",
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });
    if (r.finalPass) {
      pass++;
      continue;
    }
    for (const x of r.regionScores.filter((q) => !q.recovered)) {
      failByKey[x.key] += 1;
    }
  }
  console.log("pass", pass, "/ 200", "fail-by-quadrant", failByKey);
}

void main();
