/**
 * Pre-deploy invisibility check: boosted (current) vs legacy (scale=1) embed at 320–400px.
 * Run: npx tsx scripts/forensic-invisibility-probe.ts
 */
process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
  forensicModulationScaleForSize,
} from "@/lib/watermark/encoder/spread-spectrum";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";

type Frame = { width: number; height: number; data: Uint8ClampedArray };

function clone(f: Frame): Frame {
  return { width: f.width, height: f.height, data: new Uint8ClampedArray(f.data) };
}

function synthetic(w: number, h: number): Frame {
  const d = new Uint8ClampedArray(w * h * 4);
  let s = 0x51ed;
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
      const b = 110 + 45 * Math.sin((x / w) * Math.PI * 2) + 30 * Math.cos((y / h) * Math.PI * 4) + r() * 18;
      d[i] = b;
      d[i + 1] = b * 0.97;
      d[i + 2] = b * 0.93;
      d[i + 3] = 255;
    }
  }
  return { width: w, height: h, data: d };
}

function flat(w: number, h: number, luma: number): Frame {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = luma;
    d[i + 1] = luma * 0.98;
    d[i + 2] = luma * 0.95;
    d[i + 3] = 255;
  }
  return { width: w, height: h, data: d };
}

function lumaAt(d: Uint8ClampedArray, i: number): number {
  return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
}

function lumaMetrics(before: Frame, after: Frame) {
  let maxDelta = 0;
  let sumDelta = 0;
  let mse = 0;
  const n = before.width * before.height;
  for (let i = 0; i < before.data.length; i += 4) {
    const la = lumaAt(before.data, i);
    const lb = lumaAt(after.data, i);
    const d = Math.abs(la - lb);
    maxDelta = Math.max(maxDelta, d);
    sumDelta += d;
    mse += (la - lb) ** 2;
  }
  const psnr = mse > 0 ? 10 * Math.log10((255 * 255) / (mse / n)) : Infinity;
  return { maxDelta, meanDelta: sumDelta / n, psnr };
}

async function ssim(before: Frame, after: Frame): Promise<number> {
  const w = before.width;
  const h = before.height;
  const a = new Float64Array(w * h);
  const b = new Float64Array(w * h);
  for (let i = 0, p = 0; i < before.data.length; i += 4, p++) {
    a[p] = lumaAt(before.data, i);
    b[p] = lumaAt(after.data, i);
  }
  const mean = (arr: Float64Array) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const muA = mean(a);
  const muB = mean(b);
  let varA = 0;
  let varB = 0;
  let cov = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - muA;
    const db = b[i] - muB;
    varA += da * da;
    varB += db * db;
    cov += da * db;
  }
  varA /= a.length;
  varB /= a.length;
  cov /= a.length;
  const L = 255;
  const c1 = (0.01 * L) ** 2;
  const c2 = (0.03 * L) ** 2;
  return ((2 * muA * muB + c1) * (2 * cov + c2)) / ((muA * muA + muB * muB + c1) * (varA + varB + c2));
}

function embedVariant(
  original: Frame,
  config: ReturnType<typeof makeConfig>,
  mode: "legacy" | "boosted",
  withResilience: boolean
) {
  const img = clone(original);
  const pre = new Uint8ClampedArray(img.data);
  const scale = forensicModulationScaleForSize(img.width, img.height);
  const renderConfig =
    mode === "legacy"
      ? { ...config, modulationStrength: (config.modulationStrength ?? WATERMARK_MODULATION_STRENGTH) / scale }
      : config;
  embedInvisibleWatermark(img, renderConfig, 0);
  if (withResilience) applyCaptureResilienceLayers(img, pre, renderConfig, 0);
  return img;
}

function makeConfig(built: ReturnType<typeof buildWatermarkPayload>) {
  return {
    watermarkVersion: 1,
    sessionId: "s",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };
}

async function saveDiffStrip(label: string, before: Frame, legacy: Frame, boosted: Frame) {
  const outDir = path.join(process.cwd(), "scripts", "output", "invisibility-probe");
  fs.mkdirSync(outDir, { recursive: true });
  const crop = (f: Frame) => {
    const cx = Math.floor(f.width * 0.29);
    const cy = Math.floor(f.height * 0.29);
    const cw = Math.floor(f.width * 0.42);
    const ch = Math.floor(f.height * 0.42);
    const out = new Uint8ClampedArray(cw * ch * 4);
    for (let y = 0; y < ch; y++) {
      out.set(f.data.subarray(((cy + y) * f.width + cx) * 4, ((cy + y) * f.width + cx + cw) * 4), y * cw * 4);
    }
    return { width: cw, height: ch, data: out };
  };
  const toPng = async (f: Frame, name: string) => {
    const p = path.join(outDir, `${label}-${name}.png`);
    await sharp(Buffer.from(f.data), { raw: { width: f.width, height: f.height, channels: 4 } })
      .png()
      .toFile(p);
    return p;
  };
  await toPng(crop(before), "original");
  await toPng(crop(legacy), "legacy");
  await toPng(crop(boosted), "boosted");
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
  const config = makeConfig(built);

  const cases: Array<{ label: string; frame: Frame }> = [];
  for (const size of [320, 360, 400]) {
    cases.push({ label: `synthetic-${size}`, frame: synthetic(size, size) });
    cases.push({ label: `flat128-${size}`, frame: flat(size, size, 128) });
    cases.push({ label: `flat200-${size}`, frame: flat(size, size, 200) });
  }

  console.log("Invisibility probe — gate: maxAbsLumaDelta <= 8 (embed-only, matches unit test)\n");

  let fail = false;
  for (const { label, frame } of cases) {
    const scale = forensicModulationScaleForSize(frame.width, frame.height);
    const legacyEmbed = embedVariant(frame, config, "legacy", false);
    const boostedEmbed = embedVariant(frame, config, "boosted", false);
    const boostedFull = embedVariant(frame, config, "boosted", true);
    const legM = lumaMetrics(frame, legacyEmbed);
    const boostM = lumaMetrics(frame, boostedEmbed);
    const fullM = lumaMetrics(frame, boostedFull);
    const boostSsim = await ssim(frame, boostedEmbed);

    const ok = boostM.maxDelta <= 8 + 1e-6;
    if (!ok) fail = true;

    console.log(
      `${label} scale=${scale.toFixed(2)}`,
      `\n  legacy-embed  maxΔ=${legM.maxDelta.toFixed(2)} PSNR=${legM.psnr.toFixed(1)}dB`,
      `\n  boosted-embed maxΔ=${boostM.maxDelta.toFixed(2)} PSNR=${boostM.psnr.toFixed(1)}dB SSIM=${boostSsim.toFixed(5)}`,
      `\n  boosted+resil maxΔ=${fullM.maxDelta.toFixed(2)} PSNR=${fullM.psnr.toFixed(1)}dB`,
      ok ? " PASS" : " FAIL"
    );

    if (label.startsWith("flat128-320") || label.startsWith("synthetic-320")) {
      await saveDiffStrip(label, frame, legacyEmbed, boostedEmbed);
    }
  }

  console.log("\nCentral-region PNGs: scripts/output/invisibility-probe/");
  console.log(fail ? "\nRESULT: FAIL — boosted embed exceeds invisibility gate" : "\nRESULT: PASS — all boosted cases within maxΔ<=8");
  process.exit(fail ? 1 : 0);
}

void main();
