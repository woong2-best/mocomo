import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 7).toString("base64");
process.env.WATERMARK_ENABLED = "true";

type TestImage = { width: number; height: number; data: Uint8ClampedArray };

/** Deterministic pseudo-photo: smooth gradients plus texture, so extraction cannot
 *  succeed by accident on a flat surface. */
function syntheticImage(width: number, height: number): TestImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = 0x12345678;
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
        90 +
        60 * Math.sin((x / width) * Math.PI * 2) +
        40 * Math.cos((y / height) * Math.PI * 3) +
        rand() * 24;
      data[idx] = base;
      data[idx + 1] = base * 0.95;
      data[idx + 2] = base * 0.9;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

function cloneImage(img: TestImage): TestImage {
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

function maxAbsLumaDelta(a: TestImage, b: TestImage): number {
  let worst = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const la = a.data[i] * 0.299 + a.data[i + 1] * 0.587 + a.data[i + 2] * 0.114;
    const lb = b.data[i] * 0.299 + b.data[i + 1] * 0.587 + b.data[i + 2] * 0.114;
    worst = Math.max(worst, Math.abs(la - lb));
  }
  return worst;
}

test("embedded watermark survives a pixel round trip", async () => {
  const { buildWatermarkPayload, toBase64, decodeWatermarkCodeword, validateDecodedPayload } =
    await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark, extractQuadrantStream } = await import(
    "@/lib/watermark/encoder/spread-spectrum"
  );
  const { mergeQuadrantStreams, splitCodewordToQuadrants } = await import(
    "@/lib/watermark/encoder/quadrant-encode"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const built = buildWatermarkPayload({
    contentId: "media_roundtrip",
    sessionId: "session_roundtrip",
    userId: "user_roundtrip",
    purchaseId: "purchase_roundtrip",
    watermarkVersion: 1,
  });

  const original = syntheticImage(960, 540);
  const carried = cloneImage(original);

  embedInvisibleWatermark(
    carried,
    {
      watermarkVersion: 1,
      sessionId: "session_roundtrip",
      spreadSeedB64: toBase64(built.spreadSeed),
      codewordB64: toBase64(built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  const streams = extractQuadrantStream(carried, built.spreadSeed, 0);
  const expected = splitCodewordToQuadrants(built.codeword);

  for (const key of ["A", "B", "C", "D"] as const) {
    let same = 0;
    for (let i = 0; i < expected[key].length; i++) {
      if (streams[key][i] === expected[key][i]) same++;
    }
    assert.ok(
      same / expected[key].length > 0.6,
      `quadrant ${key} recovered only ${same}/${expected[key].length} bytes`
    );
  }

  const merged = mergeQuadrantStreams(streams, { A: 1, B: 1, C: 1, D: 1 });
  const decoded = decodeWatermarkCodeword(merged);
  assert.equal(decoded.ok, true, "codeword did not survive extraction");
  assert.equal(
    validateDecodedPayload(decoded.core!, built.opaqueWatermarkId),
    true,
    "integrity check failed after extraction"
  );
});

test("watermark survives noise and a destroyed quadrant", async () => {
  const { buildWatermarkPayload, toBase64, decodeWatermarkCodeword, validateDecodedPayload } =
    await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark, extractQuadrantStream } = await import(
    "@/lib/watermark/encoder/spread-spectrum"
  );
  const { mergeQuadrantStreams, centralQuadrantRegions } = await import(
    "@/lib/watermark/encoder/quadrant-encode"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const built = buildWatermarkPayload({
    contentId: "media_robust",
    sessionId: "session_robust",
    userId: "user_robust",
    purchaseId: "purchase_robust",
    watermarkVersion: 1,
  });

  const image = syntheticImage(1280, 720);
  embedInvisibleWatermark(
    image,
    {
      watermarkVersion: 1,
      sessionId: "session_robust",
      spreadSeedB64: toBase64(built.spreadSeed),
      codewordB64: toBase64(built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  let s = 0xc0ffee;
  const noise = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return (s / 0xffffffff - 0.5) * 4;
  };
  for (let i = 0; i < image.data.length; i += 4) {
    const n = noise();
    image.data[i] += n;
    image.data[i + 1] += n;
    image.data[i + 2] += n;
  }

  // A logo, black bar or crop can take out one region entirely.
  const [regionA] = centralQuadrantRegions(image.width, image.height);
  for (let y = regionA.y; y < regionA.y + regionA.h; y++) {
    for (let x = regionA.x; x < regionA.x + regionA.w; x++) {
      const idx = (y * image.width + x) * 4;
      image.data[idx] = 128;
      image.data[idx + 1] = 128;
      image.data[idx + 2] = 128;
    }
  }

  const streams = extractQuadrantStream(image, built.spreadSeed, 0);
  const merged = mergeQuadrantStreams(
    { A: null, B: streams.B, C: streams.C, D: streams.D },
    { B: 1, C: 1, D: 1 }
  );
  const decoded = decodeWatermarkCodeword(merged);
  assert.equal(decoded.ok, true, "codeword lost after noise plus quadrant loss");
  assert.equal(validateDecodedPayload(decoded.core!, built.opaqueWatermarkId), true);
});

test("embedding one frame stays inside the playback budget", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const built = buildWatermarkPayload({
    contentId: "media_perf",
    sessionId: "session_perf",
    userId: "user_perf",
    purchaseId: "purchase_perf",
    watermarkVersion: 1,
  });
  const config = {
    watermarkVersion: 1,
    sessionId: "session_perf",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const image = syntheticImage(1280, 720);
  embedInvisibleWatermark(image, config, 0);

  const started = performance.now();
  const frames = 20;
  for (let i = 0; i < frames; i++) embedInvisibleWatermark(image, config, i);
  const perFrame = (performance.now() - started) / frames;

  assert.ok(perFrame < 12, `embed took ${perFrame.toFixed(2)}ms per 720p frame`);
});

test("watermark stays visually imperceptible", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const built = buildWatermarkPayload({
    contentId: "media_visual",
    sessionId: "session_visual",
    userId: "user_visual",
    purchaseId: "purchase_visual",
    watermarkVersion: 1,
  });

  const original = syntheticImage(640, 360);
  const carried = cloneImage(original);
  embedInvisibleWatermark(
    carried,
    {
      watermarkVersion: 1,
      sessionId: "session_visual",
      spreadSeedB64: toBase64(built.spreadSeed),
      codewordB64: toBase64(built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  assert.ok(
    maxAbsLumaDelta(original, carried) <= 8,
    "watermark modulation is strong enough to be visible"
  );
});
