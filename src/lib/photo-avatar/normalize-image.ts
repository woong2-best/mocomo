import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { PHOTO_AVATAR_SIZE } from "@/lib/photo-avatar/types";

function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    if (typeof src === "string") img.src = src;
    else img.src = URL.createObjectURL(src);
  });
}

function faceBounds(result: FaceLandmarkerResult, w: number, h: number) {
  const lms = result.faceLandmarks?.[0];
  if (!lms?.length) return null;
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const p of lms) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const cx = ((minX + maxX) / 2) * w;
  const cy = ((minY + maxY) / 2) * h;
  const span = Math.max((maxX - minX) * w, (maxY - minY) * h) * 1.45;
  const half = span / 2;
  return {
    x: Math.max(0, cx - half),
    y: Math.max(0, cy - half),
    size: Math.min(w, h, span),
  };
}

/** 얼굴 중심 정사각형 크롭 → PHOTO_AVATAR_SIZE */
export async function normalizeFaceImage(
  file: File,
  detect: (img: HTMLImageElement | HTMLCanvasElement) => FaceLandmarkerResult
): Promise<{ blob: Blob; dataUrl: string; canvas: HTMLCanvasElement }> {
  const img = await loadImage(file);
  const probe = document.createElement("canvas");
  probe.width = img.naturalWidth;
  probe.height = img.naturalHeight;
  const pctx = probe.getContext("2d");
  if (!pctx) throw new Error("Canvas not supported");
  pctx.drawImage(img, 0, 0);

  const first = detect(probe);
  const bounds = faceBounds(first, probe.width, probe.height);
  if (!bounds) throw new Error("얼굴을 찾을 수 없습니다. 정면 얼굴이 보이는 사진을 올려 주세요.");

  const out = document.createElement("canvas");
  out.width = PHOTO_AVATAR_SIZE;
  out.height = PHOTO_AVATAR_SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    probe,
    bounds.x,
    bounds.y,
    bounds.size,
    bounds.size,
    0,
    0,
    PHOTO_AVATAR_SIZE,
    PHOTO_AVATAR_SIZE
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("변환 실패"))), "image/webp", 0.92);
  });

  return { blob, dataUrl: out.toDataURL("image/webp", 0.92), canvas: out };
}
