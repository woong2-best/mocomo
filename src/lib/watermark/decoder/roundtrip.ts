import { WATERMARK_MODULATION_STRENGTH, WATERMARK_TEMPORAL_PERIOD } from "@/lib/watermark/config";
import { toBase64 } from "@/lib/watermark/crypto/payload";
import { embedInvisibleWatermark } from "@/lib/watermark/encoder/spread-spectrum";
import {
  detectWatermarkInFrame,
  prepareCandidate,
  type DetectionCandidate,
} from "@/lib/watermark/decoder/pipeline";

function syntheticFrame(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = 0xabc123;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const b = 100 + 40 * Math.sin((x / width) * Math.PI * 2) + rand() * 20;
      data[i] = b;
      data[i + 1] = b * 0.96;
      data[i + 2] = b * 0.92;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Server-side encoder → detector check for a stored session (no browser capture). */
export function verifySessionEncoderRoundtrip(candidate: DetectionCandidate) {
  const prepared = prepareCandidate(candidate);
  const frame = syntheticFrame(1280, 720);
  embedInvisibleWatermark(
    frame,
    {
      watermarkVersion: candidate.watermarkVersion,
      sessionId: candidate.id,
      spreadSeedB64: toBase64(prepared.spreadSeed),
      codewordB64: toBase64(prepared.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
    0
  );
  const result = detectWatermarkInFrame(frame, [prepared]);
  return {
    ok: result.status === "MATCH" && result.integrityValid && result.eccValid,
    status: result.status,
    confidence: result.confidence,
    centralScore: result.centralScore,
    eccValid: result.eccValid,
    integrityValid: result.integrityValid,
  };
}
