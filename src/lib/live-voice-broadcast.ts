import type { LiveBroadcastMode } from "@prisma/client";

/** 스푼형 보이스 라이브 — LiveKit 오디오 SFU (영상 CDN 미사용) */
export function isVoiceBroadcastMode(mode?: LiveBroadcastMode | string | null): boolean {
  return mode === "VOICE";
}
