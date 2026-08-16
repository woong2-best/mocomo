import type { WatermarkQuadrantKey } from "@/lib/watermark/config";

export type WatermarkDetectionStatus =
  | "MATCH"
  | "POSSIBLE_MATCH"
  | "INCONCLUSIVE"
  | "NOT_DETECTED";

export type WatermarkPayloadCore = {
  version: number;
  contentIdShort: Uint8Array;
  sessionIdShort: Uint8Array;
  nonce: Uint8Array;
  integrity: Uint8Array;
};

export type EncodedWatermarkPayload = {
  codeword: Uint8Array;
  spreadSeed: Uint8Array;
  opaqueWatermarkId: string;
};

export type ForensicRenderConfig = {
  watermarkVersion: number;
  sessionId: string;
  spreadSeedB64: string;
  codewordB64: string;
  temporalPeriod: number;
  modulationStrength: number;
};

export type QuadrantRegion = {
  key: WatermarkQuadrantKey;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DetectionRegionScore = {
  key: WatermarkQuadrantKey;
  score: number;
  recovered: boolean;
};

export type WatermarkDetectionResult = {
  detected: boolean;
  status: WatermarkDetectionStatus;
  confidence: number;
  watermarkVersion: number | null;
  sessionId: string | null;
  contentId: string | null;
  opaqueWatermarkId: string | null;
  detectedRegions: DetectionRegionScore[];
  temporalMatches: number;
  distributedScore: number;
  centralScore: number;
  integrityValid: boolean;
  eccValid: boolean;
  metadata?: Record<string, unknown>;
};

export type WatermarkSessionClientResponse = {
  sessionId: string;
  watermarkVersion: number;
  renderConfig: ForensicRenderConfig;
};

export type AdminWatermarkDetectionResponse = WatermarkDetectionResult & {
  message: string;
  session?: {
    id: string;
    createdAt: string;
    opaqueWatermarkId: string;
  } | null;
  content?: {
    id: string;
    title: string | null;
    authorUsername: string;
  } | null;
  purchase?: {
    id: string;
    price: number;
    createdAt: string;
  } | null;
  member?: {
    id: string;
    username: string;
  } | null;
  analysisLog?: {
    framesAnalyzed?: number;
    candidateFrames?: number;
  };
};
