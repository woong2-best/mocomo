/** Test flat/low-texture content + subgrid layer impact at 320×320 */
process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
} from "@/lib/watermark/encoder/spread-spectrum";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import { verifyWatermarkFrame } from "@/lib/watermark/verify-watermark-frame";
import { REGION_RECOVERED_THRESHOLD } from "@/lib/watermark/decoder/confidence";

type Frame = { width: number; height: number; data: Uint8ClampedArray };

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

function run(label: string, img: Frame, withResilience: boolean, config: object, built: ReturnType<typeof buildWatermarkPayload>) {
  const pre = new Uint8ClampedArray(img.data);
  embedInvisibleWatermark(img, config as never, 0);
  if (withResilience) applyCaptureResilienceLayers(img, pre, config as never, 0);
  const r = verifyWatermarkFrame({
    frame: img,
    renderConfig: config as never,
    opaqueWatermarkId: built.opaqueWatermarkId,
    contentId: "m",
    expectedIntegrityB64: toBase64(built.core.integrity),
    phase: 0,
  });
  console.log(
    label,
    withResilience ? "+resilience" : "embed-only",
    "pass",
    r.finalPass,
    r.regionScores.map((x) => `${x.key}:${x.score.toFixed(4)}${x.recovered ? "✓" : "✗"}`).join(" ")
  );
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

console.log("threshold", REGION_RECOVERED_THRESHOLD);

for (const luma of [128, 200, 40, 250]) {
  run(`flat luma=${luma} 320`, flat(320, 320, luma), false, config, built);
  run(`flat luma=${luma} 320`, { ...flat(320, 320, luma) }, true, config, built);
}

for (const luma of [128, 200]) {
  run(`flat luma=${luma} 960`, flat(960, 540, luma), true, config, built);
}
