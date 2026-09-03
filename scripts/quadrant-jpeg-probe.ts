process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import sharp from "sharp";
import { buildWatermarkPayload, toBase64 } from "@/lib/watermark/crypto/payload";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
} from "@/lib/watermark/encoder/spread-spectrum";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import { verifyWatermarkFrame } from "@/lib/watermark/verify-watermark-frame";
import { REGION_RECOVERED_THRESHOLD } from "@/lib/watermark/decoder/confidence";

function synth(w: number, h: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  let s = 0x51ed;
  const r = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const b = 110 + 45 * Math.sin((x / w) * Math.PI * 2) + 30 * Math.cos((y / h) * Math.PI * 4) + r() * 18;
      d[i] = b;
      d[i + 1] = b * 0.97;
      d[i + 2] = b * 0.93;
      d[i + 3] = 255;
    }
  }
  return { width: w, height: h, data: d };
}

async function jpegRoundtrip(frame: { width: number; height: number; data: Uint8ClampedArray }, quality: number) {
  const jpeg = await sharp(Buffer.from(frame.data), {
    raw: { width: frame.width, height: frame.height, channels: 4 },
  })
    .jpeg({ quality })
    .toBuffer();
  const { data, info } = await sharp(jpeg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

const built = buildWatermarkPayload({
  contentId: "m",
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

async function main() {
  console.log("REGION_RECOVERED_THRESHOLD =", REGION_RECOVERED_THRESHOLD);

  for (const quality of [95, 92, 85, 75]) {
    let img = synth(320, 320);
    img = await jpegRoundtrip(img, quality);
    const pre = new Uint8ClampedArray(img.data);
    embedInvisibleWatermark(img, config, 0);
    applyCaptureResilienceLayers(img, pre, config, 0);
    const r = verifyWatermarkFrame({
      frame: img,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "m",
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });
    console.log(
      `jpeg q=${quality}`,
      "pass",
      r.finalPass,
      "recovered",
      r.recoveredCount,
      r.regionScores.map((x) => `${x.key}:${x.score.toFixed(4)}${x.recovered ? "✓" : "✗"}`).join(" ")
    );
  }

  for (const quality of [92, 85]) {
    let img = synth(320, 320);
    img = await jpegRoundtrip(img, quality);
    const pre = new Uint8ClampedArray(img.data);
    embedInvisibleWatermark(img, config, 0);
    applyCaptureResilienceLayers(img, pre, config, 0);
    const afterEmbed = await jpegRoundtrip(img, quality);
    const r = verifyWatermarkFrame({
      frame: afterEmbed,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: "m",
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });
    console.log(
      `jpeg q=${quality} recompress after embed`,
      "pass",
      r.finalPass,
      "recovered",
      r.recoveredCount,
      r.regionScores.map((x) => `${x.key}:${x.score.toFixed(4)}${x.recovered ? "✓" : "✗"}`).join(" ")
    );
  }
}

void main();
