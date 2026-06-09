/** 정사각형 얼굴 이미지 권장 크기 (업로드 시 자동 맞춤) */
export const PHOTO_AVATAR_SIZE = 512;

export type PhotoAvatarRegion = {
  /** 0~1 정규화 좌표 */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PhotoAvatarRig = {
  version: 1;
  imageSize: number;
  /** blob: 또는 https URL */
  imageUrl: string;
  faceCenter: { x: number; y: number };
  leftEye: PhotoAvatarRegion;
  rightEye: PhotoAvatarRegion;
  mouth: PhotoAvatarRegion;
  /** 입술 분리선 Y (0~1) — 아래쪽이 턱 */
  mouthSplitY: number;
};

export type PhotoAvatarRenderMode = "vrm" | "photo" | "flat2d";
