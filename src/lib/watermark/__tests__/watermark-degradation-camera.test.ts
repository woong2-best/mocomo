import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 19).toString("base64");
process.env.WATERMARK_ENABLED = "true";

type TestImage = { width: number; height: number; data: Uint8ClampedArray };

function syntheticImage(width: number, height: number): TestImage {
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

async function sessionFixture() {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { prepareCandidate } = await import("@/lib/watermark/decoder/pipeline");

  const built = buildWatermarkPayload({
    contentId: "media_camera",
    sessionId: "session_camera",
    userId: "user_camera",
    purchaseId: "purchase_camera",
    watermarkVersion: 1,
    sessionNonce: "nonce_camera".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "session_camera",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const prepared = prepareCandidate({
    id: "session_camera",
    contentId: "media_camera",
    userId: "user_camera",
    purchaseId: "purchase_camera",
    sessionNonce: "nonce_camera".padEnd(32, "0"),
    watermarkVersion: 1,
    opaqueWatermarkId: built.opaqueWatermarkId,
  });

  return { config, prepared, candidate: prepared.candidate, phase: 0 };
}

test("laptop or phone OS screenshot (jpeg) stays attributable", async () => {
  const { embedCaptureResilientWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrames } = await import("@/lib/watermark/decoder/pipeline");
  const { decodeCaptureFrames } = await import("@/lib/watermark/decoder/capture-frames");
  const { config, candidate } = await sessionFixture();
  const sharp = (await import("sharp")).default;

  const display = syntheticImage(854, 480);
  embedCaptureResilientWatermark(display, config, 0);

  const jpeg = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .jpeg({ quality: 85 })
    .toBuffer();

  const frames = await decodeCaptureFrames(jpeg);
  const result = detectWatermarkInFrames(frames, [candidate], { exhaustive: true });

  assert.ok(
    result.status === "MATCH" || result.status === "POSSIBLE_MATCH",
    `OS screenshot jpeg → ${result.status} central=${result.centralScore.toFixed(2)}`
  );
});

test("phone photo of a laptop screen may be inconclusive under heavy blur", async () => {
  const { embedCaptureResilientWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrames } = await import("@/lib/watermark/decoder/pipeline");
  const { decodeCaptureFrames } = await import("@/lib/watermark/decoder/capture-frames");
  const { config, candidate } = await sessionFixture();
  const sharp = (await import("sharp")).default;

  const display = syntheticImage(854, 480);
  embedCaptureResilientWatermark(display, config, 0);

  const photo = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .resize(Math.round(display.width * 0.82), Math.round(display.height * 0.82))
    .blur(0.5)
    .jpeg({ quality: 82 })
    .toBuffer();

  const frames = await decodeCaptureFrames(photo);
  const result = detectWatermarkInFrames(frames, [candidate], { exhaustive: true });

  assert.ok(
    result.centralScore >= 0.45,
    `camera-style photo should not crash; got ${result.status} central=${result.centralScore.toFixed(2)}`
  );
});
