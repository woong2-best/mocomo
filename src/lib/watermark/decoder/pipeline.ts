import {
  WATERMARK_QUADRANT_KEYS,
  WATERMARK_TEMPORAL_PERIOD,
} from "@/lib/watermark/config";
import {
  decodeWatermarkCodeword,
  validateDecodedPayload,
} from "@/lib/watermark/crypto/payload";
import { deriveSpreadSeed } from "@/lib/watermark/crypto/secrets";
import { computeDetectionConfidence, scoreRegionMatch } from "@/lib/watermark/decoder/confidence";
import { extractQuadrantStream } from "@/lib/watermark/encoder/spread-spectrum";
import {
  mergeQuadrantStreams,
  splitCodewordToQuadrants,
} from "@/lib/watermark/encoder/quadrant-encode";
import type { DetectionRegionScore, WatermarkDetectionResult } from "@/lib/watermark/types";

export type PixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export async function detectWatermarkFromFrame(
  frame: PixelFrame,
  options?: { frameIndex?: number; candidateOpaqueIds?: string[] }
): Promise<WatermarkDetectionResult> {
  const frameIndex = options?.frameIndex ?? 0;
  const { db } = await import("@/lib/db");

  const sessions = await db.watermarkSession.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED"] } },
    orderBy: { createdAt: "desc" },
    take: options?.candidateOpaqueIds?.length ? 50 : 300,
    select: {
      id: true,
      contentId: true,
      opaqueWatermarkId: true,
      watermarkVersion: true,
    },
  });

  let best: WatermarkDetectionResult | null = null;

  for (const session of sessions) {
    if (
      options?.candidateOpaqueIds?.length &&
      !options.candidateOpaqueIds.includes(session.opaqueWatermarkId)
    ) {
      continue;
    }

    const spreadSeed = deriveSpreadSeed(session.opaqueWatermarkId, session.watermarkVersion);
    const streams = extractQuadrantStream(frame, spreadSeed, frameIndex % WATERMARK_TEMPORAL_PERIOD);
    const merged = mergeQuadrantStreams(streams, { A: 1, B: 1, C: 1, D: 1 });

    const decoded = decodeWatermarkCodeword(merged);
    const integrityValid =
      decoded.ok && decoded.core
        ? validateDecodedPayload(decoded.core, session.opaqueWatermarkId)
        : false;

    const expected = splitCodewordToQuadrants(merged);
    const regionScores: DetectionRegionScore[] = WATERMARK_QUADRANT_KEYS.map((key) => {
      const score = scoreRegionMatch(expected[key], streams[key] ?? new Uint8Array());
      return { key, score, recovered: score >= 0.55 };
    });

    const centralScore =
      regionScores.reduce((a, r) => a + r.score, 0) / Math.max(1, regionScores.length);
    const distributedScore = centralScore * 0.92;
    const temporalScore = frameIndex > 0 ? centralScore * 0.88 : centralScore * 0.7;

    const { confidence, status } = computeDetectionConfidence({
      centralScore,
      distributedScore,
      temporalScore,
      eccValid: decoded.eccValid,
      integrityValid,
      regionScores,
    });

    const result: WatermarkDetectionResult = {
      detected: status === "MATCH" || status === "POSSIBLE_MATCH",
      status,
      confidence,
      watermarkVersion: session.watermarkVersion,
      sessionId: session.id,
      contentId: session.contentId,
      opaqueWatermarkId: session.opaqueWatermarkId,
      detectedRegions: regionScores,
      temporalMatches: frameIndex > 0 ? 1 : 0,
      distributedScore,
      centralScore,
      integrityValid,
      eccValid: decoded.eccValid,
    };

    if (!best || result.confidence > best.confidence) best = result;
    if (status === "MATCH" && integrityValid) break;
  }

  if (best) return best;

  return {
    detected: false,
    status: "NOT_DETECTED",
    confidence: 0,
    watermarkVersion: null,
    sessionId: null,
    contentId: null,
    opaqueWatermarkId: null,
    detectedRegions: [],
    temporalMatches: 0,
    distributedScore: 0,
    centralScore: 0,
    integrityValid: false,
    eccValid: false,
  };
}

export async function detectWatermarkFromImageBuffer(buf: Buffer): Promise<WatermarkDetectionResult> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(buf)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const frame: PixelFrame = {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };

  let best: WatermarkDetectionResult | null = null;
  for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase += 5) {
    const result = await detectWatermarkFromFrame(frame, { frameIndex: phase });
    if (!best || result.confidence > best.confidence) best = result;
    if (result.status === "MATCH") break;
  }
  return best!;
}

export async function detectWatermarkFromVideoBuffer(buf: Buffer): Promise<
  WatermarkDetectionResult & { framesAnalyzed: number; candidateFrames: number }
> {
  const sharp = (await import("sharp")).default;
  let best: WatermarkDetectionResult | null = null;
  let framesAnalyzed = 0;
  let candidateFrames = 0;

  for (let page = 0; page < 24; page++) {
    try {
      const { data, info } = await sharp(buf, { animated: true, page })
        .rotate()
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      framesAnalyzed++;
      const frame: PixelFrame = {
        width: info.width,
        height: info.height,
        data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      };
      for (let phase = 0; phase < WATERMARK_TEMPORAL_PERIOD; phase += 10) {
        const result = await detectWatermarkFromFrame(frame, { frameIndex: phase + page });
        if (result.confidence > 0.35) candidateFrames++;
        if (!best || result.confidence > best.confidence) best = result;
        if (result.status === "MATCH") {
          return { ...result, framesAnalyzed, candidateFrames };
        }
      }
    } catch {
      break;
    }
  }

  if (best) return { ...best, framesAnalyzed, candidateFrames };
  return {
    detected: false,
    status: "NOT_DETECTED",
    confidence: 0,
    watermarkVersion: null,
    sessionId: null,
    contentId: null,
    opaqueWatermarkId: null,
    detectedRegions: [],
    temporalMatches: 0,
    distributedScore: 0,
    centralScore: 0,
    integrityValid: false,
    eccValid: false,
    framesAnalyzed,
    candidateFrames,
  };
}
