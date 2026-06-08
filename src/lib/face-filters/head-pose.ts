import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export type HeadPose = {
  yaw: number;
  pitch: number;
  roll: number;
  scale: number;
};

/** 얼굴 랜드마크·변환 행렬로 고개 각도 추정 (3D 마스크·귀 회전용) */
export function estimateHeadPose(
  result: FaceLandmarkerResult | undefined,
  w: number,
  h: number,
  mirrored = false
): HeadPose | null {
  const face = result?.faceLandmarks?.[0];
  if (!face) return null;

  const lm = (i: number) => ({
    x: mirrored ? (1 - face[i].x) * w : face[i].x * w,
    y: face[i].y * h,
  });
  const leftEye = lm(33);
  const rightEye = lm(263);
  const nose = lm(1);
  const chin = lm(152);
  const forehead = lm(10);

  const eyeMid = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const eyeDx = rightEye.x - leftEye.x;
  const eyeDy = rightEye.y - leftEye.y;
  const roll = Math.atan2(eyeDy, eyeDx);

  const faceW = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) * 2.4;
  const yaw = faceW > 1 ? ((nose.x - eyeMid.x) / faceW) * 1.4 : 0;
  const pitch =
    forehead && chin
      ? ((nose.y - eyeMid.y) / Math.max(1, chin.y - forehead.y)) * 0.9
      : 0;

  const matrix = result?.facialTransformationMatrixes?.[0]?.data;
  let scale = faceW / w;
  if (matrix && matrix.length >= 16) {
    const sx = Math.hypot(matrix[0], matrix[1], matrix[2]);
    const sy = Math.hypot(matrix[4], matrix[5], matrix[6]);
    scale = ((sx + sy) / 2) * 2.2;
  }

  return { yaw, pitch, roll, scale: Math.max(0.15, Math.min(scale, 0.65)) };
}
