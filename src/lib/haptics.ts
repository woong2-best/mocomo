/** 모바일 삭제 등 강한 피드백 — iOS는 미지원, Android Chrome 등에서 동작 */
export function vibrateDeleteFeedback(ms = 500): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
