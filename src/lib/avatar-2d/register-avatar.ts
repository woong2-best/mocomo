"use client";

import { uploadImageBlob } from "@/lib/client-upload";
import { setPhotoAvatarRenderMode } from "@/lib/photo-avatar/photo-avatar-storage";
import { addCharacterToLibrary } from "@/lib/avatar-2d/library";
import type { Flat2dAvatarSource } from "@/lib/avatar-2d/types";

export async function registerFlat2dAvatar(
  pngBlob: Blob,
  opts: { width: number; height: number; source: Flat2dAvatarSource; name?: string }
): Promise<{ cloudUrl?: string; characterId: string }> {
  let cloudUrl: string | undefined;
  try {
    cloudUrl = await uploadImageBlob(pngBlob, `avatar-2d-${Date.now()}.png`);
  } catch {
    /* 로컬 저장만 */
  }

  const characterId = await addCharacterToLibrary(pngBlob, {
    width: opts.width,
    height: opts.height,
    source: opts.source,
    cloudUrl,
  });

  setPhotoAvatarRenderMode("flat2d");
  return { cloudUrl, characterId };
}

/** File → PNG blob (투명 유지) */
export async function fileToPngBlob(file: File, maxSize = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG 변환에 실패했습니다.");
  return blob;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG 내보내기 실패"));
    }, "image/png");
  });
}
