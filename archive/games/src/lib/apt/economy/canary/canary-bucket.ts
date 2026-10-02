import { createHash } from "crypto";

/** 동일 사용자·동일 Canary에 항상 같은 버킷(0–99) */
export function userCanaryBucket(userId: string, canaryId: string): number {
  const hash = createHash("sha256").update(`${userId}:${canaryId}`).digest();
  return hash.readUInt32BE(0) % 100;
}
