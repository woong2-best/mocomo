import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import type { PhotoAvatarRegion, PhotoAvatarRig } from "@/lib/photo-avatar/types";
import { PHOTO_AVATAR_SIZE } from "@/lib/photo-avatar/types";

type Pt = { x: number; y: number };

function lm(result: FaceLandmarkerResult, index: number, w: number, h: number): Pt | null {
  const lms = result.faceLandmarks?.[0];
  if (!lms?.[index]) return null;
  const p = lms[index];
  return { x: p.x * w, y: p.y * h };
}

function regionFromPoints(points: Pt[], w: number, h: number, pad = 0.35): PhotoAvatarRegion {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = (maxX - minX) * (1 + pad);
  const bh = (maxY - minY) * (1 + pad);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    x: Math.max(0, (cx - bw / 2) / w),
    y: Math.max(0, (cy - bh / 2) / h),
    w: Math.min(1, bw / w),
    h: Math.min(1, bh / h),
  };
}

export function buildPhotoAvatarRig(
  result: FaceLandmarkerResult,
  imageUrl: string,
  imageSize: number
): PhotoAvatarRig {
  const w = imageSize;
  const h = imageSize;

  const leftPts = [33, 133, 159, 145, 153, 154, 155, 133]
    .map((i) => lm(result, i, w, h))
    .filter(Boolean) as Pt[];
  const rightPts = [263, 362, 386, 374, 373, 380, 381, 362]
    .map((i) => lm(result, i, w, h))
    .filter(Boolean) as Pt[];
  const mouthPts = [61, 291, 13, 14, 78, 308, 87, 317, 0, 17]
    .map((i) => lm(result, i, w, h))
    .filter(Boolean) as Pt[];

  const nose = lm(result, 1, w, h);
  const upperLip = lm(result, 13, w, h);
  const lowerLip = lm(result, 14, w, h);

  if (leftPts.length < 3 || rightPts.length < 3 || mouthPts.length < 4 || !nose) {
    throw new Error("얼굴 눈·입 영역을 찾지 못했습니다. 정면 얼굴 사진을 사용해 주세요.");
  }

  const faceCenter = {
    x: nose.x / w,
    y: nose.y / h,
  };

  const mouthSplitY =
    upperLip && lowerLip
      ? (upperLip.y + lowerLip.y) / 2 / h
      : (mouthPts.reduce((s, p) => s + p.y, 0) / mouthPts.length) / h;

  return {
    version: 1,
    imageSize: PHOTO_AVATAR_SIZE,
    imageUrl,
    faceCenter,
    leftEye: regionFromPoints(leftPts, w, h, 0.5),
    rightEye: regionFromPoints(rightPts, w, h, 0.5),
    mouth: regionFromPoints(mouthPts, w, h, 0.25),
    mouthSplitY,
  };
}
