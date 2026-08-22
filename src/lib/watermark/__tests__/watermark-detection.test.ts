import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 11).toString("base64");
process.env.WATERMARK_ENABLED = "true";

type TestImage = { width: number; height: number; data: Uint8ClampedArray };

function syntheticImage(width: number, height: number, seed = 0x1a2b3c4d): TestImage {
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

function candidate(n: number) {
  return {
    id: `session_${n}`,
    contentId: `media_${n}`,
    userId: `user_${n}`,
    purchaseId: `purchase_${n}`,
    sessionNonce: `nonce_${n}`.padEnd(32, "0"),
    watermarkVersion: 1,
    opaqueWatermarkId: "",
  };
}

async function withOpaqueId(c: ReturnType<typeof candidate>) {
  const { buildWatermarkPayload } = await import("@/lib/watermark/crypto/payload");
  const built = buildWatermarkPayload({
    contentId: c.contentId,
    sessionId: c.id,
    userId: c.userId,
    purchaseId: c.purchaseId,
    watermarkVersion: c.watermarkVersion,
    sessionNonce: c.sessionNonce,
  });
  return { ...c, opaqueWatermarkId: built.opaqueWatermarkId, built };
}

test("detector attributes a frame to the session that produced it", async () => {
  const { toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const target = await withOpaqueId(candidate(7));
  const decoys = await Promise.all([1, 2, 3, 4, 5].map((n) => withOpaqueId(candidate(n))));

  const frame = syntheticImage(1280, 720);
  const phase = 11;
  embedInvisibleWatermark(
    frame,
    {
      watermarkVersion: 1,
      sessionId: target.id,
      spreadSeedB64: toBase64(target.built.spreadSeed),
      codewordB64: toBase64(target.built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    phase
  );

  const prepared = [...decoys, target].map((c) =>
    prepareCandidate({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      purchaseId: c.purchaseId,
      sessionNonce: c.sessionNonce,
      watermarkVersion: c.watermarkVersion,
      opaqueWatermarkId: c.opaqueWatermarkId,
    })
  );

  const result = detectWatermarkInFrame(frame, prepared);
  assert.equal(result.status, "MATCH");
  assert.equal(result.sessionId, target.id);
  assert.equal(result.integrityValid, true);
});

test("detector does not attribute a clean frame to anyone", async () => {
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );

  const decoys = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => withOpaqueId(candidate(n))));
  const prepared = decoys.map((c) =>
    prepareCandidate({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      purchaseId: c.purchaseId,
      sessionNonce: c.sessionNonce,
      watermarkVersion: c.watermarkVersion,
      opaqueWatermarkId: c.opaqueWatermarkId,
    })
  );

  const clean = syntheticImage(1280, 720, 0x99887766);
  const result = detectWatermarkInFrame(clean, prepared);

  assert.notEqual(result.status, "MATCH");
  assert.equal(result.integrityValid, false);
  assert.equal(result.status, "NOT_DETECTED", "unmarked capture should not look like partial signal");
});

test("detector rejects a frame watermarked for a different session", async () => {
  const { toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const actual = await withOpaqueId(candidate(42));
  const others = await Promise.all([1, 2, 3].map((n) => withOpaqueId(candidate(n))));

  const frame = syntheticImage(1280, 720);
  embedInvisibleWatermark(
    frame,
    {
      watermarkVersion: 1,
      sessionId: actual.id,
      spreadSeedB64: toBase64(actual.built.spreadSeed),
      codewordB64: toBase64(actual.built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  const prepared = others.map((c) =>
    prepareCandidate({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      purchaseId: c.purchaseId,
      sessionNonce: c.sessionNonce,
      watermarkVersion: c.watermarkVersion,
      opaqueWatermarkId: c.opaqueWatermarkId,
    })
  );

  const result = detectWatermarkInFrame(frame, prepared);
  assert.notEqual(result.status, "MATCH", "attributed a leak to an unrelated session");
});

test("candidate search stays fast enough for an admin request", async () => {
  const { toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const target = await withOpaqueId(candidate(500));
  const pool = await Promise.all(
    Array.from({ length: 120 }, (_, i) => withOpaqueId(candidate(i)))
  );

  const frame = syntheticImage(1280, 720);
  embedInvisibleWatermark(
    frame,
    {
      watermarkVersion: 1,
      sessionId: target.id,
      spreadSeedB64: toBase64(target.built.spreadSeed),
      codewordB64: toBase64(target.built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    3
  );

  const prepared = [...pool, target].map((c) =>
    prepareCandidate({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      purchaseId: c.purchaseId,
      sessionNonce: c.sessionNonce,
      watermarkVersion: c.watermarkVersion,
      opaqueWatermarkId: c.opaqueWatermarkId,
    })
  );

  const started = performance.now();
  const result = detectWatermarkInFrame(frame, prepared);
  const elapsed = performance.now() - started;

  assert.equal(result.sessionId, target.id);
  assert.ok(elapsed < 20000, `searching 121 sessions took ${Math.round(elapsed)}ms`);
});

test("detector finds watermark when media is centered inside a larger screenshot", async () => {
  const { toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const target = await withOpaqueId(candidate(901));
  const inner = syntheticImage(640, 480);
  embedInvisibleWatermark(
    inner,
    {
      watermarkVersion: 1,
      sessionId: target.id,
      spreadSeedB64: toBase64(target.built.spreadSeed),
      codewordB64: toBase64(target.built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  const padX = 420;
  const padY = 280;
  const screenshot = syntheticImage(inner.width + padX * 2, inner.height + padY * 2, 0xabcdef01);
  for (let y = 0; y < inner.height; y++) {
    for (let x = 0; x < inner.width; x++) {
      const src = (y * inner.width + x) * 4;
      const dst = ((y + padY) * screenshot.width + (x + padX)) * 4;
      screenshot.data[dst] = inner.data[src];
      screenshot.data[dst + 1] = inner.data[src + 1];
      screenshot.data[dst + 2] = inner.data[src + 2];
      screenshot.data[dst + 3] = inner.data[src + 3];
    }
  }

  const prepared = [target].map((c) =>
    prepareCandidate({
      id: c.id,
      contentId: c.contentId,
      userId: c.userId,
      purchaseId: c.purchaseId,
      sessionNonce: c.sessionNonce,
      watermarkVersion: c.watermarkVersion,
      opaqueWatermarkId: c.opaqueWatermarkId,
    })
  );

  const result = detectWatermarkInFrame(screenshot, prepared, true);
  assert.equal(result.status, "MATCH");
  assert.equal(result.sessionId, target.id);
});

test("encoder output decodes through detector without browser capture", async () => {
  const { toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrame, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const target = await withOpaqueId(candidate(808));
  const frame = syntheticImage(1280, 720);
  embedInvisibleWatermark(
    frame,
    {
      watermarkVersion: 1,
      sessionId: target.id,
      spreadSeedB64: toBase64(target.built.spreadSeed),
      codewordB64: toBase64(target.built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );

  const prepared = [
    prepareCandidate({
      id: target.id,
      contentId: target.contentId,
      userId: target.userId,
      purchaseId: target.purchaseId,
      sessionNonce: target.sessionNonce,
      watermarkVersion: target.watermarkVersion,
      opaqueWatermarkId: target.opaqueWatermarkId,
    }),
  ];

  const result = detectWatermarkInFrame(frame, prepared);
  assert.equal(result.status, "MATCH");
  assert.equal(result.eccValid, true);
  assert.equal(result.integrityValid, true);
  assert.ok(result.centralScore >= 0.9, `central bit agreement ${result.centralScore}`);
});
