import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

/** High-contrast patches — stresses pair clamp near 0/255 (browser photo path). */
function harshPhoto320(): { width: number; height: number; data: Uint8ClampedArray } {
  const w = 320;
  const h = 320;
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const patch =
        x < w / 3 ? 245 : x < (2 * w) / 3 ? 128 + ((x + y) % 17) : 12 + ((x * y) % 9);
      d[i] = patch;
      d[i + 1] = patch * 0.96;
      d[i + 2] = patch * 0.9;
      d[i + 3] = 255;
    }
  }
  return { width: w, height: h, data: d };
}

test("320px harsh photo self-verify passes ECC+integrity after pair-aware embed", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark, applyCaptureResilienceLayers } = await import(
    "@/lib/watermark/encoder/spread-spectrum"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");

  const built = buildWatermarkPayload({
    contentId: "harsh",
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

  const img = harshPhoto320();
  const pre = new Uint8ClampedArray(img.data);
  embedInvisibleWatermark(img, config, 0);
  applyCaptureResilienceLayers(img, pre, config, 0);

  const result = verifyWatermarkFrame({
    frame: img,
    renderConfig: config,
    opaqueWatermarkId: built.opaqueWatermarkId,
    contentId: "harsh",
    expectedIntegrityB64: toBase64(built.core.integrity),
    phase: 0,
  });

  assert.equal(result.hasExpectedIntegrity, true);
  assert.equal(result.finalPass, true, JSON.stringify({
    status: result.status,
    ecc: result.eccValid,
    integrity: result.integrityValid,
    merged: result.mergedCodewordAgreement,
    scores: result.regionScores.map((r) => r.score),
  }));
  assert.ok(result.mergedCodewordAgreement >= 0.95);
});
