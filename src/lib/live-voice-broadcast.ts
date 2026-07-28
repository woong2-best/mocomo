import type { LiveBroadcastMode } from "@prisma/client";

/** 스푼형 보이스 라이브 — 비활성 (신규 생성·허브 노출 중단) */
export const VOICE_LIVE_ENABLED = false;

export function isVoiceBroadcastMode(mode?: LiveBroadcastMode | string | null): boolean {
  return mode === "VOICE";
}
