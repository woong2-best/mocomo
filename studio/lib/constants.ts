import type { StudioAssetCategory, StudioAssetStatus } from "@prisma/client";

export const STUDIO_PLATFORM_FEE_PERCENT = 15;
export const STUDIO_MIN_PAYOUT_KRW = 10_000;

export const STUDIO_MAX_FILE_BYTES = 50 * 1024 * 1024;
export const STUDIO_MAX_POLYGONS = 50_000;
export const STUDIO_MAX_TEXTURE_SIZE = 2048;

/** 업로드 UI에서 선택 가능한 원본 형식 */
export const STUDIO_IMPORT_EXTENSIONS = [".glb", ".gltf", ".obj", ".fbx"] as const;
/** 스토리지에 저장되는 형식 (OBJ/FBX는 클라이언트에서 GLB로 변환) */
export const STUDIO_ALLOWED_EXTENSIONS = [".glb", ".gltf"] as const;

export const STUDIO_CATEGORY_LABELS: Record<StudioAssetCategory, string> = {
  FURNITURE: "가구",
  DECOR: "장식품",
  WALLPAPER: "벽지",
  FLOORING: "바닥재",
  LIGHTING: "조명",
  PLANT: "식물",
  POSTER: "포스터",
  HOUSEHOLD: "생활용품",
  AVATAR_ACCESSORY: "아바타 액세서리",
  AVATAR_CLOTHING: "아바타 의상",
};

export const STUDIO_STATUS_LABELS: Record<StudioAssetStatus, string> = {
  DRAFT: "초안",
  SUBMITTED: "제출됨",
  REVIEWING: "검수 중",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  PUBLISHED: "배포됨",
};

export const STUDIO_CATEGORIES = Object.keys(STUDIO_CATEGORY_LABELS) as StudioAssetCategory[];
