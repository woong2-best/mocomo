"use client";

import { buildPhotoAvatarRig } from "@/lib/photo-avatar/build-rig";
import { getImageFaceLandmarker } from "@/lib/photo-avatar/image-landmarker";
import { normalizeFaceImage } from "@/lib/photo-avatar/normalize-image";
import { savePhotoAvatarRig } from "@/lib/photo-avatar/photo-avatar-storage";
import type { PhotoAvatarRig } from "@/lib/photo-avatar/types";
import { prepareGalleryImageForUpload } from "@/lib/gallery-image-upload";
import { uploadImageBlob } from "@/lib/client-upload";

export async function createPhotoAvatarFromFile(file: File): Promise<PhotoAvatarRig> {
  const prepared = await prepareGalleryImageForUpload(file);
  const landmarker = await getImageFaceLandmarker();
  if (!landmarker) throw new Error("얼굴 인식 모듈을 불러오지 못했습니다.");

  const detect = (source: HTMLImageElement | HTMLCanvasElement) => {
    const result = landmarker.detect(source);
    if (!result.faceLandmarks?.length) throw new Error("FACE_NOT_FOUND");
    return result;
  };

  let normalized;
  try {
    normalized = await normalizeFaceImage(prepared, detect);
  } catch (e) {
    if (e instanceof Error && e.message === "FACE_NOT_FOUND") {
      throw new Error("얼굴을 찾을 수 없습니다. 정면 얼굴 사진을 올려 주세요.");
    }
    throw e;
  }

  const result = landmarker.detect(normalized.canvas);
  if (!result.faceLandmarks?.length) {
    throw new Error("크롭 후 얼굴 인식에 실패했습니다.");
  }

  let cloudUrl: string | null = null;
  try {
    cloudUrl = await uploadImageBlob(normalized.blob, `photo-avatar-${Date.now()}.webp`);
  } catch {
    /* IndexedDB만 사용 */
  }

  const rig = buildPhotoAvatarRig(
    result,
    cloudUrl ?? normalized.dataUrl,
    normalized.canvas.width
  );

  await savePhotoAvatarRig(rig, normalized.blob);
  return rig;
}
