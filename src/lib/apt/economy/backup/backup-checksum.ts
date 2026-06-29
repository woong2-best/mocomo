import { createHash } from "crypto";
import type { EconomySnapshotPayload } from "./backup-types";

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortValue(obj[key]);
  }
  return sorted;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function computePayloadChecksum(payload: EconomySnapshotPayload): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

export function verifyPayloadChecksum(
  payload: EconomySnapshotPayload,
  checksum: string
): boolean {
  return computePayloadChecksum(payload) === checksum;
}
