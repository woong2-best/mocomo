/** 시청자로 인정하는 최근 활동 기준 (ms) */
export const LIVE_VIEWER_TTL_MS = 60_000;

export function liveViewerCutoff(): Date {
  return new Date(Date.now() - LIVE_VIEWER_TTL_MS);
}
