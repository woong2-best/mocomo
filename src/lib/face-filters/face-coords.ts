import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type FacePt = { x: number; y: number };

/** MediaPipe 정규 좌표 → 캔버스 픽셀 (미러는 상위 ctx transform에서 처리) */
export function landmarkPt(
  result: FaceLandmarkerResult | undefined,
  index: number,
  w: number,
  h: number
): FacePt | null {
  const p = result?.faceLandmarks?.[0]?.[index];
  if (!p) return null;
  return { x: p.x * w, y: p.y * h };
}

export function faceVerticalSpan(forehead: FacePt, chin: FacePt) {
  const top = Math.min(forehead.y, chin.y);
  const bottom = Math.max(forehead.y, chin.y);
  return { top, bottom, height: Math.max(1, bottom - top) };
}
