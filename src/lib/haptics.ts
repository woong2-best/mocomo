/** 모바일 삭제 등 강한 피드백 — iOS는 미지원, Android Chrome 등에서 동작 */
export function vibrateDeleteFeedback(ms = 500): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

/** 가구 배치·저장 등 가벼운 성공 피드백 */
export function vibrateLightTap(ms = 12): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

/** 미션·구매 등 중간 강도 피드백 */
export function vibrateSuccess(ms = 28): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([ms, 40, ms]);
  } catch {
    /* ignore */
  }
}
