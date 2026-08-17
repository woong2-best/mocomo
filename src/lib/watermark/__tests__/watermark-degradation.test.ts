import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 13).toString("base64");
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

async function embedSession() {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );

  const built = buildWatermarkPayload({
    contentId: "media_degrade",
    sessionId: "session_degrade",
    userId: "user_degrade",
    purchaseId: "purchase_degrade",
    watermarkVersion: 1,
    sessionNonce: "nonce_degrade".padEnd(32, "0"),
  });
  const config = {
    watermarkVersion: 1,
    sessionId: "session_degrade",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };
  const candidate = prepareCandidate({
    id: "session_degrade",
    contentId: "media_degrade",
    userId: "user_degrade",
    purchaseId: "purchase_degrade",
    sessionNonce: "nonce_degrade".padEnd(32, "0"),
    watermarkVersion: 1,
    opaqueWatermarkId: built.opaqueWatermarkId,
  });

  const marked = syntheticImage(960, 540);
  embedInvisibleWatermark(marked, config, 0);
  return { marked, detect: (frame: TestImage) => detectWatermarkInFrame(frame, [candidate]) };
}

test("detection after jpeg recompression", async () => {
  const { marked, detect } = await embedSession();
  const sharp = (await import("sharp")).default;
  const encoded = await sharp(Buffer.from(marked.data), {
    raw: { width: marked.width, height: marked.height, channels: 4 },
  })
    .jpeg({ quality: 70 })
    .toBuffer();
  const { data, info } = await sharp(encoded).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const result = detect({
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  });
  assert.ok(
    result.status === "MATCH" || result.status === "POSSIBLE_MATCH",
    `jpeg q70 → ${result.status} confidence=${result.confidence.toFixed(2)}`
  );
});

test("detection after downscale and upscale", async () => {
  const { marked, detect } = await embedSession();
  const sharp = (await import("sharp")).default;
  const small = await sharp(Buffer.from(marked.data), {
    raw: { width: marked.width, height: marked.height, channels: 4 },
  })
    .resize(Math.round(marked.width * 0.5), Math.round(marked.height * 0.5))
    .resize(marked.width, marked.height)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = detect({
    width: small.info.width,
    height: small.info.height,
    data: new Uint8ClampedArray(small.data.buffer, small.data.byteOffset, small.data.byteLength),
  });
  assert.ok(
    result.status === "MATCH" ||
      result.status === "POSSIBLE_MATCH" ||
      result.status === "INCONCLUSIVE" ||
      result.status === "NOT_DETECTED",
    `resize 50% roundtrip → ${result.status}`
  );
});

test("detection after a center crop that keeps three quadrants", async () => {
  const { marked, detect } = await embedSession();
  const cropX = Math.round(marked.width * 0.08);
  const cropY = Math.round(marked.height * 0.08);
  const cropW = marked.width - cropX * 2;
  const cropH = marked.height - cropY * 2;
  const cropped: TestImage = {
    width: cropW,
    height: cropH,
    data: new Uint8ClampedArray(cropW * cropH * 4),
  };
  for (let y = 0; y < cropH; y++) {
    const src = ((y + cropY) * marked.width + cropX) * 4;
    cropped.data.set(marked.data.subarray(src, src + cropW * 4), y * cropW * 4);
  }
  const result = detect(cropped);
  assert.ok(
    result.status === "MATCH" ||
      result.status === "POSSIBLE_MATCH" ||
      result.status === "INCONCLUSIVE" ||
      result.status === "NOT_DETECTED",
    `center crop → ${result.status}`
  );
});
