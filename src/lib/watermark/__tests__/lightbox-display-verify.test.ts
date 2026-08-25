import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
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

async function fixture() {
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { embedInvisibleWatermark } = await import(
    "@/lib/watermark/encoder/spread-spectrum"
  );
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");
  const { isForensicEmbedSizeReady } = await import("@/components/media/forensic-canvas-fit");

  const built = buildWatermarkPayload({
    contentId: "media_lightbox",
    sessionId: "session_lightbox",
    userId: "user_lightbox",
    purchaseId: "purchase_lightbox",
    watermarkVersion: 1,
    sessionNonce: "nonce_lightbox".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "session_lightbox",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const paintAtDisplaySize = (w: number, h: number) => {
    assert.equal(isForensicEmbedSizeReady({ cssWidth: w, cssHeight: h, width: w, height: h, devicePixelRatio: 1 }), true);
    const img = syntheticImage(w, h);
    embedInvisibleWatermark(img, config, 0);
    return verifyWatermarkFrame({
      frame: img,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "media_lightbox",
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });
  };

  return { paintAtDisplaySize };
}

const LIGHTBOX_SIZES: Array<[number, number]> = [
  [960, 592],
  [854, 480],
  [640, 360],
  [480, 360],
  [320, 320],
  [320, 240],
];

for (const [w, h] of LIGHTBOX_SIZES) {
  test(`lightbox display ${w}x${h} embed+verify passes canonical gate`, async () => {
    const { paintAtDisplaySize } = await fixture();
    const result = paintAtDisplaySize(w, h);
    assert.equal(
      result.finalPass,
      true,
      `${w}x${h} → ${result.status} ecc=${result.eccValid} integrity=${result.integrityValid} central=${result.centralScore.toFixed(2)}`
    );
    assert.equal(result.status, "MATCH");
  });
}
