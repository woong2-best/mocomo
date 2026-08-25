import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

test("CLIENT_EMBED_MERGED_THRESHOLD accepts production-like 0.9323 agreement", async () => {
  const { CLIENT_EMBED_MERGED_THRESHOLD } = await import("@/lib/watermark/decoder/confidence");
  assert.equal(CLIENT_EMBED_MERGED_THRESHOLD, 0.9);
  assert.ok(0.9323 >= CLIENT_EMBED_MERGED_THRESHOLD);
});

test("client embed gate passes on 320 embed when RS-on-merge would fail at 0.9323", async () => {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { scoreRegionMatch } = await import("@/lib/watermark/decoder/confidence");
  const { rsDecode } = await import("@/lib/watermark/error-correction/reed-solomon");
  const { WATERMARK_PARITY_BYTES, WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } =
    await import("@/lib/watermark/config");
  const { embedInvisibleWatermark, applyCaptureResilienceLayers } = await import(
    "@/lib/watermark/encoder/spread-spectrum"
  );
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");

  const built = buildWatermarkPayload({
    contentId: "gate",
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

  // Model production: merged agreement ~0.9323 fails strict RS(48,32).
  const corrupted = Uint8Array.from(built.codeword);
  let s = 9323;
  const flips = new Set<number>();
  while (flips.size < 26) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    flips.add(s % (corrupted.length * 8));
  }
  for (const bitIdx of flips) {
    const byteIdx = bitIdx >> 3;
    corrupted[byteIdx] ^= 1 << (7 - (bitIdx & 7));
  }
  const agreement = scoreRegionMatch(built.codeword, corrupted);
  assert.ok(agreement >= 0.92 && agreement <= 0.94);
  assert.equal(rsDecode(corrupted, WATERMARK_PARITY_BYTES).ok, false);

  const img = { width: 320, height: 320, data: new Uint8ClampedArray(320 * 320 * 4) };
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 180;
    img.data[i + 1] = 175;
    img.data[i + 2] = 170;
    img.data[i + 3] = 255;
  }
  const pre = new Uint8ClampedArray(img.data);
  embedInvisibleWatermark(img, config, 0);
  applyCaptureResilienceLayers(img, pre, config, 0);
  const r = verifyWatermarkFrame({
    frame: img,
    renderConfig: config,
    opaqueWatermarkId: built.opaqueWatermarkId,
    contentId: "gate",
    expectedIntegrityB64: toBase64(built.core.integrity),
    phase: 0,
  });

  assert.equal(r.finalPass, true);
  assert.equal(r.integrityValid, true);
});
