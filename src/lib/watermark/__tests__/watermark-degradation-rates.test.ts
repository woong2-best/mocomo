/**
 * Phase 6 — synthetic degradation detection rates (Node/sharp, NOT browser).
 * Run: node --import tsx src/lib/watermark/__tests__/watermark-degradation-rates.test.ts
 */

import test from "node:test";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 23).toString("base64");
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
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );
  const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");

  const built = buildWatermarkPayload({
    contentId: "media_rates",
    sessionId: "session_rates",
    userId: "user_rates",
    purchaseId: "purchase_rates",
    watermarkVersion: 1,
    sessionNonce: "nonce_rates".padEnd(32, "0"),
  });

  const config = {
    watermarkVersion: 1,
    sessionId: "session_rates",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  const marked = syntheticImage(960, 540);
  embedInvisibleWatermark(marked, config, 0);

  const detect = async (frame: TestImage) => {
    const result = verifyWatermarkFrame({
      frame,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "media_rates",
      phase: 0,
    });
    return result.finalPass && result.status === "MATCH";
  };

  return { marked, detect, sharp: (await import("sharp")).default };
}

type Case = { label: string; run: (marked: TestImage, sharp: Awaited<ReturnType<typeof fixture>>["sharp"]) => Promise<TestImage> };

const CASES: Case[] = [
  {
    label: "baseline (no degradation)",
    run: async (m) => m,
  },
  {
    label: "JPEG Q90",
    run: async (m, sharp) => {
      const buf = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .jpeg({ quality: 90 })
        .toBuffer();
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "JPEG Q75",
    run: async (m, sharp) => {
      const buf = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .jpeg({ quality: 75 })
        .toBuffer();
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "resize 50%",
    run: async (m, sharp) => {
      const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .resize(Math.round(m.width * 0.5), Math.round(m.height * 0.5))
        .resize(m.width, m.height)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "blur sigma 2",
    run: async (m, sharp) => {
      const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .blur(2)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "brightness +15%",
    run: async (m, sharp) => {
      const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .modulate({ brightness: 1.15 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "contrast 0.85",
    run: async (m, sharp) => {
      const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .linear(0.85, 0)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
  {
    label: "crop 15% edges",
    run: async (m) => {
      const cx = Math.round(m.width * 0.15);
      const cy = Math.round(m.height * 0.15);
      const cw = m.width - cx * 2;
      const ch = m.height - cy * 2;
      const out: TestImage = { width: cw, height: ch, data: new Uint8ClampedArray(cw * ch * 4) };
      for (let y = 0; y < ch; y++) {
        const src = ((y + cy) * m.width + cx) * 4;
        out.data.set(m.data.subarray(src, src + cw * 4), y * cw * 4);
      }
      return out;
    },
  },
  {
    label: "rotation 5°",
    run: async (m, sharp) => {
      const { data, info } = await sharp(Buffer.from(m.data), { raw: { width: m.width, height: m.height, channels: 4 } })
        .rotate(5, { background: { r: 110, g: 107, b: 102, alpha: 1 } })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength) };
    },
  },
];

test("degradation detection rates (canonical verify, synthetic)", async () => {
  const { marked, detect, sharp } = await fixture();
  const rows: Array<{ label: string; pass: boolean }> = [];

  for (const c of CASES) {
    const frame = await c.run(marked, sharp);
    const pass = await detect(frame);
    rows.push({ label: c.label, pass });
    console.info(`[degradation-rate] ${c.label}: ${pass ? "MATCH" : "FAIL"}`);
  }

  const matchCount = rows.filter((r) => r.pass).length;
  console.info(`[degradation-rate] summary: ${matchCount}/${rows.length} MATCH (Node synthetic, NOT browser)`);
});
