import { test } from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

test("verifyWatermarkFrame matches embedded synthetic frame (TEST A canonical path)", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { WATERMARK_MODULATION_STRENGTH, WATERMARK_TEMPORAL_PERIOD } = await import(
    "@/lib/watermark/config"
  );
  const { embedCaptureResilientWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");

  const built = buildWatermarkPayload({
    contentId: "media_e2e",
    sessionId: "session_e2e",
    userId: "user_e2e",
    purchaseId: "purchase_e2e",
    watermarkVersion: 1,
    sessionNonce: "nonce_e2e".padEnd(32, "0"),
  });

  const renderConfig = {
    watermarkVersion: 1,
    sessionId: "session_e2e",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const w = 640;
  const h = 360;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    const base = 100 + (i % 97);
    data[i] = base;
    data[i + 1] = base * 0.96;
    data[i + 2] = base * 0.92;
    data[i + 3] = 255;
  }
  const frame = { width: w, height: h, data };
  embedCaptureResilientWatermark(frame, renderConfig, 0);

  const result = verifyWatermarkFrame({
    frame,
    renderConfig,
    opaqueWatermarkId: built.opaqueWatermarkId,
    contentId: "media_e2e",
    phase: 0,
  });

  assert.equal(result.status, "MATCH");
  assert.equal(result.eccValid, true);
  assert.equal(result.integrityValid, true);
  assert.equal(result.finalPass, true);
  assert.equal(result.sessionId, "session_e2e");
});

test("verifyWatermarkFrame client path uses expectedIntegrityB64 without master secret", async () => {
  delete process.env.WATERMARK_MASTER_SECRET;

  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
  const built = buildWatermarkPayload({
    contentId: "media_client",
    sessionId: "session_client",
    userId: "user_client",
    purchaseId: "purchase_client",
    watermarkVersion: 1,
    sessionNonce: "nonce_client".padEnd(32, "0"),
  });
  delete process.env.WATERMARK_MASTER_SECRET;

  const { WATERMARK_MODULATION_STRENGTH, WATERMARK_TEMPORAL_PERIOD } = await import(
    "@/lib/watermark/config"
  );
  const { embedCaptureResilientWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");

  const renderConfig = {
    watermarkVersion: 1,
    sessionId: "session_client",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const w = 640;
  const h = 360;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    const base = 100 + (i % 97);
    data[i] = base;
    data[i + 1] = base * 0.96;
    data[i + 2] = base * 0.92;
    data[i + 3] = 255;
  }
  const frame = { width: w, height: h, data };
  embedCaptureResilientWatermark(frame, renderConfig, 0);

  const result = verifyWatermarkFrame({
    frame,
    renderConfig,
    opaqueWatermarkId: built.opaqueWatermarkId,
    contentId: "media_client",
    expectedIntegrityB64: toBase64(built.core.integrity),
    phase: 0,
  });

  assert.equal(result.status, "MATCH");
  assert.equal(result.integrityValid, true);
  assert.equal(result.finalPass, true);
});
