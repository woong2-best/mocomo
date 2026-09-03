process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
} from "@/lib/watermark/encoder/spread-spectrum";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import { verifyWatermarkFrame, quadrantScoresFromResult } from "@/lib/watermark/verify-watermark-frame";
import { REGION_RECOVERED_THRESHOLD } from "@/lib/watermark/decoder/confidence";

function synth(w: number, h: number) {
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

for (const [w, h] of [
  [320, 320],
  [320, 240],
  [360, 360],
  [400, 300],
] as const) {
  const img = synth(w, h);
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
  const scores = quadrantScoresFromResult(r);
  console.log(
    `${w}x${h}`,
    "finalPass",
    r.finalPass,
    "ecc",
    r.eccValid,
    "recovered",
    r.recoveredCount,
    scores,
    r.regionScores.map((x) => `${x.key}:${x.score.toFixed(4)}${x.recovered ? "✓" : ""}`).join(" ")
  );
}

const failByKey: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
let pass = 0;
for (let t = 0; t < 300; t++) {
  const img = synth(320, 320);
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
console.log("MC 320x320 synthetic 300 runs: pass", pass, "fail-by-quadrant", failByKey);
