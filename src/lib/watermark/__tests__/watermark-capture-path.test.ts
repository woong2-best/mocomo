import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

type TestImage = { width: number; height: number; data: Uint8ClampedArray };

function syntheticImage(width: number, height: number, seed = 0xabc123): TestImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = seed >>> 0;
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
        100 +
        50 * Math.sin((x / width) * Math.PI * 2) +
        35 * Math.cos((y / height) * Math.PI * 3) +
        rand() * 20;
      data[idx] = base;
      data[idx + 1] = base * 0.96;
      data[idx + 2] = base * 0.92;
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
    contentId: "media_capture",
    sessionId: "session_capture",
    userId: "user_capture",
    purchaseId: "purchase_capture",
    watermarkVersion: 1,
    sessionNonce: "nonce_capture".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "session_capture",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const prepared = prepareCandidate({
    id: "session_capture",
    contentId: "media_capture",
    userId: "user_capture",
    purchaseId: "purchase_capture",
    sessionNonce: "nonce_capture".padEnd(32, "0"),
    watermarkVersion: 1,
    opaqueWatermarkId: built.opaqueWatermarkId,
  });

  return { config, prepared, candidate: prepared.candidate, phase: 4 };
}

test("display-size embed matches screenshot capture coordinates (exportPng path)", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame } = await import("@/lib/watermark/decoder/pipeline");
  const { config, prepared, candidate, phase } = await sessionFixture();

  const display = syntheticImage(640, 360);
  embedInvisibleWatermark(display, config, phase);

  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .png()
    .toBuffer();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frame = {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };

  const result = detectWatermarkInFrame(frame, [prepared]);
  assert.equal(result.status, "MATCH");
  assert.equal(result.sessionId, "session_capture");
  assert.equal(result.integrityValid, true);
});

test("native-resolution embed fails after display downscale (old video bug)", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame } = await import("@/lib/watermark/decoder/pipeline");
  const { config, prepared, candidate, phase } = await sessionFixture();

  const native = syntheticImage(1920, 1080);
  embedInvisibleWatermark(native, config, phase);

  const sharp = (await import("sharp")).default;
  const downscaled = await sharp(Buffer.from(native.data), {
    raw: { width: native.width, height: native.height, channels: 4 },
  })
    .resize(640, 360)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const frame = {
    width: downscaled.info.width,
    height: downscaled.info.height,
    data: new Uint8ClampedArray(
      downscaled.data.buffer,
      downscaled.data.byteOffset,
      downscaled.data.byteLength
    ),
  };

  const result = detectWatermarkInFrame(frame, [prepared], true);
  assert.notEqual(result.status, "MATCH", "native embed must not survive arbitrary downscale");
});

test("screen-recording style jpeg frames stay attributable", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrames } = await import("@/lib/watermark/decoder/pipeline");
  const { config, candidate, phase } = await sessionFixture();
  const sharp = (await import("sharp")).default;

  const display = syntheticImage(854, 480);
  embedInvisibleWatermark(display, config, phase);

  const frames = await Promise.all(
    [0, 1, 2].map(async () => {
      const jpeg = await sharp(Buffer.from(display.data), {
        raw: { width: display.width, height: display.height, channels: 4 },
      })
        .jpeg({ quality: 82 })
        .toBuffer();
      const { data, info } = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return {
        width: info.width,
        height: info.height,
        data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      };
    })
  );

  const result = detectWatermarkInFrames(frames, [candidate]);

  assert.ok(
    result.status === "MATCH" || result.status === "POSSIBLE_MATCH",
    `jpeg recording frames → ${result.status} confidence=${result.confidence.toFixed(2)} central=${result.centralScore.toFixed(2)}`
  );
  assert.equal(result.sessionId, "session_capture");
});
