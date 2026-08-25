/**
 * RS(48,32) decode threshold vs bit/byte agreement.
 * Run: npx tsx scripts/rs-threshold-probe.ts
 */
process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 17).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import { buildWatermarkPayload, decodeWatermarkCodeword, toBase64 } from "@/lib/watermark/crypto/payload";
import { rsEncode, rsDecode } from "@/lib/watermark/error-correction/reed-solomon";
import { scoreRegionMatch } from "@/lib/watermark/decoder/confidence";
import {
  WATERMARK_CODEWORD_BYTES,
  WATERMARK_DATA_BYTES,
  WATERMARK_PARITY_BYTES,
} from "@/lib/watermark/config";
import {
  embedInvisibleWatermark,
  applyCaptureResilienceLayers,
  extractQuadrantStream,
} from "@/lib/watermark/encoder/spread-spectrum";
import { mergeQuadrantStreams, splitCodewordToQuadrants } from "@/lib/watermark/encoder/quadrant-encode";
import { verifyWatermarkFrame } from "@/lib/watermark/verify-watermark-frame";
import { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } from "@/lib/watermark/config";
import sharp from "sharp";

function flipRandomBits(data: Uint8Array, targetAgreement: number, seed = 1): Uint8Array {
  const out = Uint8Array.from(data);
  const totalBits = out.length * 8;
  const targetWrong = Math.round(totalBits * (1 - targetAgreement));
  let s = seed >>> 0;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
  const flips = new Set<number>();
  while (flips.size < targetWrong) {
    flips.add(rand() % totalBits);
  }
  for (const bitIdx of flips) {
    const byteIdx = bitIdx >> 3;
    const bit = 7 - (bitIdx & 7);
    out[byteIdx] ^= 1 << bit;
  }
  return out;
}

function corruptRandomBytes(data: Uint8Array, byteErrors: number, seed = 1): Uint8Array {
  const out = Uint8Array.from(data);
  let s = seed >>> 0;
  const indices = new Set<number>();
  while (indices.size < byteErrors && indices.size < out.length) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    indices.add(s % out.length);
  }
  for (const i of indices) {
    out[i] ^= 0xff;
  }
  return out;
}

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

async function jpegRoundtrip(img: { width: number; height: number; data: Uint8ClampedArray }, quality: number) {
  const buf = await sharp(Buffer.from(img.data), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .jpeg({ quality })
    .toBuffer();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

async function main() {
  const built = buildWatermarkPayload({
    contentId: "m",
    sessionId: "s",
    userId: "u",
    purchaseId: "p",
    watermarkVersion: 1,
    sessionNonce: "n".padEnd(32, "0"),
  });
  const codeword = built.codeword;

  console.log(`RS(${WATERMARK_CODEWORD_BYTES},${WATERMARK_DATA_BYTES}) parity=${WATERMARK_PARITY_BYTES}`);
  console.log(`Theoretical max byte errors correctable: floor(parity/2)=${Math.floor(WATERMARK_PARITY_BYTES / 2)}`);
  console.log(`Codeword bits: ${WATERMARK_CODEWORD_BYTES * 8}\n`);

  console.log("--- Random BYTE corruption (XOR 0xff) ---");
  for (let e = 0; e <= 12; e++) {
    let ok = 0;
    const trials = 200;
    for (let t = 0; t < trials; t++) {
      const corrupted = corruptRandomBytes(codeword, e, 1000 + t);
      if (rsDecode(corrupted, WATERMARK_PARITY_BYTES).ok) ok++;
    }
    console.log(`  ${e} byte errors: ${ok}/${trials} decode ok`);
  }

  console.log("\n--- Target BIT agreement (random flips, 500 trials each) ---");
  for (const agreement of [0.99, 0.97, 0.95, 0.94, 0.93, 0.92, 0.91, 0.9, 0.88, 0.85]) {
    let ok = 0;
    const trials = 500;
    for (let t = 0; t < trials; t++) {
      const corrupted = flipRandomBits(codeword, agreement, 2000 + t);
      if (rsDecode(corrupted, WATERMARK_PARITY_BYTES).ok) ok++;
    }
    const wrongBits = Math.round(WATERMARK_CODEWORD_BYTES * 8 * (1 - agreement));
    console.log(`  agreement=${agreement.toFixed(2)} (~${wrongBits} wrong bits): ${ok}/${trials} decode ok`);
  }

  console.log("\n--- Production-like self-verify @ 320 after JPEG pre-embed ---");
  const config = {
    watermarkVersion: 1,
    sessionId: "s",
    spreadSeedB64: toBase64(built.spreadSeed),
    codewordB64: toBase64(built.codeword),
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: WATERMARK_MODULATION_STRENGTH,
  };

  for (const q of [95, 92, 88, 85, 82, 75, 70, 60]) {
    let img = synth(320, 320);
    img = await jpegRoundtrip(img, q);
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
      `  jpeg q=${q} merged=${r.mergedCodewordAgreement.toFixed(4)} ecc=${r.eccValid} decodeOk=${r.decodeOk} pass=${r.finalPass}`
    );
  }

  console.log("\n--- Agreement 0.9323 injection on real codeword ---");
  let ok932 = 0;
  for (let t = 0; t < 1000; t++) {
    const corrupted = flipRandomBits(codeword, 0.9323, 9000 + t);
    const agreement = scoreRegionMatch(codeword, corrupted);
    const decoded = rsDecode(corrupted, WATERMARK_PARITY_BYTES);
    if (decoded.ok) ok932++;
    if (t < 3) {
      console.log(`  trial ${t}: measured agreement=${agreement.toFixed(4)} decode=${decoded.ok}`);
    }
  }
  console.log(`  0.9323 agreement: ${ok932}/1000 RS decode ok`);

  // Merge simulation: 4 quadrants each at ~0.89 agreement
  console.log("\n--- Parity sweep: bit agreement vs RS decode ---");
  for (const parity of [16, 20, 22, 24]) {
    const dataLen = 48 - parity;
    const msg = new Uint8Array(dataLen).map((_, i) => (i * 7 + 13) & 0xff);
    const cw = rsEncode(msg, parity);
    const row: string[] = [`parity=${parity} (data=${dataLen}, maxByteErr=${Math.floor(parity / 2)})`];
    for (const agreement of [0.99, 0.97, 0.95, 0.9323, 0.93, 0.92]) {
      let ok = 0;
      const trials = 300;
      for (let t = 0; t < trials; t++) {
        if (rsDecode(flipRandomBits(cw, agreement, 5000 + t), parity).ok) ok++;
      }
      row.push(`${agreement.toFixed(4)}→${ok}/${trials}`);
    }
    console.log(row.join(" | "));
  }
}

void main();
