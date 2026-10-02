/** localStorage — 첫 인상 시퀀스 완료 (재방문 스킵) */
export const FIRST_IMPRESSION_STORAGE_KEY = "apt-first-impression-v1";

/** Performance API marks */
export const PERF_MARK_ENTRY_START = "apt-first-entry-start";
export const PERF_MARK_INTERIOR_READY = "apt-interior-ready";

/** Phase durations (ms) — total target ≤ 5000 */
export const FIRST_ENTRY_TIMING = {
  loading: 520,
  reveal: 1050,
  dwell: 680,
  enterRoom: 420,
  uiFade: 580,
} as const;

export const FIRST_ENTRY_LIVING_ROOM_ID = "living";

export function shouldPlayFirstImpression(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_SKIP_FIRST_ENTRY === "1") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("replayIntro") === "1") return true;
  try {
    return localStorage.getItem(FIRST_IMPRESSION_STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markFirstImpressionComplete(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FIRST_IMPRESSION_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
