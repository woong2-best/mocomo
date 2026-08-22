/** Forensic watermark feature flags and constants — server + shared client config */

export const WATERMARK_PROTOCOL_VERSION = 1;

export const WATERMARK_DATA_BYTES = 32;
export const WATERMARK_PARITY_BYTES = 16;
export const WATERMARK_CODEWORD_BYTES = WATERMARK_DATA_BYTES + WATERMARK_PARITY_BYTES;

export const WATERMARK_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

/** Forensic session starts as soon as paid media is opened. Kept at 0. */
export const WATERMARK_MIN_VIEW_SECONDS = 0;

/** Luminance modulation depth. Paired pixels move in opposite directions by this
 *  amount, so the visible change stays under 2% of range while the differential
 *  clears sensor and compression noise well enough to decode. */
export const WATERMARK_MODULATION_STRENGTH = 5;

export function getWatermarkModulationStrength(): number {
  const parsed = Number(process.env.WATERMARK_MODULATION_STRENGTH ?? WATERMARK_MODULATION_STRENGTH);
  if (!Number.isFinite(parsed)) return WATERMARK_MODULATION_STRENGTH;
  return Math.max(3, Math.min(10, Math.floor(parsed)));
}

export const WATERMARK_BLOCK_SIZE = 8;
export const WATERMARK_TEMPORAL_PERIOD = 30;
export const WATERMARK_DISTRIBUTED_ANCHORS = 12;

export const WATERMARK_QUADRANT_KEYS = ["A", "B", "C", "D"] as const;

export type WatermarkQuadrantKey = (typeof WATERMARK_QUADRANT_KEYS)[number];

export function isWatermarkEnabled(): boolean {
  const raw = process.env.WATERMARK_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getWatermarkVersion(): number {
  const parsed = Number(process.env.WATERMARK_VERSION ?? WATERMARK_PROTOCOL_VERSION);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : WATERMARK_PROTOCOL_VERSION;
}

/** Safe public config for client bootstrap */
export function getWatermarkPublicConfig() {
  return {
    enabled: isWatermarkEnabled(),
    watermarkVersion: getWatermarkVersion(),
    protocolVersion: WATERMARK_PROTOCOL_VERSION,
    temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
    modulationStrength: getWatermarkModulationStrength(),
  };
}
