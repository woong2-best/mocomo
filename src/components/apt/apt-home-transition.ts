/** 동물의숲 스타일 — 검은 화면 페이드 → 씬 전환 → 페이드 아웃 */
export type AptHomeTransitionPhase = null | "enter-out" | "enter-in" | "exit-out" | "exit-in";

export const APT_FADE_OUT_MS = 380;
export const APT_FADE_HOLD_MS = 80;
export const APT_FADE_IN_MS = 420;

export function isTransitioning(phase: AptHomeTransitionPhase): boolean {
  return phase !== null;
}
