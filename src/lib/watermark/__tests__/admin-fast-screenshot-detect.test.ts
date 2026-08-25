import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

function syntheticImage(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = 0x51ed;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const base =
        110 +
        45 * Math.sin((x / width) * Math.PI * 2) +
        30 * Math.cos((y / height) * Math.PI * 4) +
        rand() * 18;
      data[idx] = base;
      data[idx + 1] = base * 0.97;
      data[idx + 2] = base * 0.93;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

test("admin fast path detects OS screenshot of lightbox embed (creator scope)", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { detectWatermarkInFrames } = await import("@/lib/watermark/decoder/pipeline");
  const { prepareCandidate } = await import("@/lib/watermark/decoder/pipeline");
  const { decodeCaptureFramesFast } = await import("@/lib/watermark/decoder/capture-frames");
  const sharp = (await import("sharp")).default;

  const built = buildWatermarkPayload({
    contentId: "media_admin",
    sessionId: "session_admin",
    userId: "user_admin",
    purchaseId: "purchase_admin",
    watermarkVersion: 1,
    sessionNonce: "nonce_admin".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "session_admin",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const display = syntheticImage(960, 592);
  embedInvisibleWatermark(display, config, 0);

  const png = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const frames = await decodeCaptureFramesFast(png);
  assert.equal(frames.length, 3);

  const prepared = prepareCandidate({
    id: "session_admin",
    contentId: "media_admin",
    userId: "user_admin",
    purchaseId: "purchase_admin",
    sessionNonce: "nonce_admin".padEnd(32, "0"),
    watermarkVersion: 1,
    opaqueWatermarkId: built.opaqueWatermarkId,
  });

  const result = detectWatermarkInFrames(frames, [prepared.candidate], { fast: true });
  assert.equal(result.status, "MATCH");
  assert.equal(result.integrityValid, true);
  assert.equal(result.eccValid, true);
  assert.ok(result.confidence >= 0.9);
});

test("flat UI field stays near-invisible at lightbox size (texture-adaptive embed)", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const built = buildWatermarkPayload({
    contentId: "flat",
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

  const w = 960;
  const h = 592;
  const before = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < before.length; i += 4) {
    before[i] = 235;
    before[i + 1] = 235;
    before[i + 2] = 230;
    before[i + 3] = 255;
  }

  const after = new Uint8ClampedArray(before);
  embedInvisibleWatermark({ width: w, height: h, data: after }, config, 0);

  let maxDelta = 0;
  for (let i = 0; i < before.length; i += 4) {
    const la = before[i] * 0.299 + before[i + 1] * 0.587 + before[i + 2] * 0.114;
    const lb = after[i] * 0.299 + after[i + 1] * 0.587 + after[i + 2] * 0.114;
    maxDelta = Math.max(maxDelta, Math.abs(la - lb));
  }

  assert.ok(maxDelta <= 2.5, `flat field maxΔ=${maxDelta.toFixed(2)} exceeds invisibility gate`);
});
