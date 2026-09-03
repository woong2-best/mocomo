process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
  forensicModulationScaleForSize,
} from "@/lib/watermark/encoder/spread-spectrum";
import { verifyWatermarkFrame } from "@/lib/watermark/verify-watermark-frame";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";

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

function run(label: string, w: number, h: number, luma: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = luma;
    d[i + 1] = luma * 0.97;
    d[i + 2] = luma * 0.93;
    d[i + 3] = 255;
  }
  const img = { width: w, height: h, data: d };
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
    "scale",
    forensicModulationScaleForSize(w, h).toFixed(2),
    "pass",
    r.finalPass,
    "ecc",
    r.eccValid,
    "int",
    r.integrityValid,
    "status",
    r.status,
    r.regionScores.map((x) => `${x.key}:${x.score.toFixed(3)}`).join(" ")
  );
}

for (const l of [250, 240, 220, 128, 20, 10]) run(`320 luma=${l}`, 320, 320, l);

// Simulate ~87% agreement by flipping random bits after embed
const d = new Uint8ClampedArray(320 * 320 * 4);
for (let i = 0; i < d.length; i += 4) {
  d[i] = 180;
  d[i + 1] = 175;
  d[i + 2] = 170;
  d[i + 3] = 255;
}
const img = { width: 320, height: 320, data: d };
const pre = new Uint8ClampedArray(img.data);
embedInvisibleWatermark(img, config, 0);
applyCaptureResilienceLayers(img, pre, config, 0);
const r0 = verifyWatermarkFrame({
  frame: img,
  renderConfig: config,
  opaqueWatermarkId: built.opaqueWatermarkId,
  contentId: "m",
  expectedIntegrityB64: toBase64(built.core.integrity),
  phase: 0,
});
console.log("before noise", r0.finalPass, r0.eccValid, r0.status, r0.regionScores.map((x) => x.score.toFixed(3)));

for (let i = 0; i < img.data.length; i += 97) {
  img.data[i] = Math.min(255, img.data[i] + (Math.random() > 0.5 ? 3 : -3));
}
const r1 = verifyWatermarkFrame({
  frame: img,
  renderConfig: config,
  opaqueWatermarkId: built.opaqueWatermarkId,
  contentId: "m",
  expectedIntegrityB64: toBase64(built.core.integrity),
  phase: 0,
});
console.log("after noise", r1.finalPass, r1.eccValid, r1.status, r1.regionScores.map((x) => x.score.toFixed(3)));
