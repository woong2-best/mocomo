import { isLegacyPackedDefaultLayout } from "@/lib/diorama/living-room-preset";
import {
  loadLocalDioramaLayout,
  saveLocalDioramaLayout,
  clearLocalDioramaLayout,
} from "@/lib/apt/local-home-store";
import type { StickerInstance } from "./sticker-types";

export type LoadStickerResult = {
  instances: StickerInstance[];
  canEdit: boolean;
};

export type StickerStorageOptions = {
  /** 이웃 집 등 — 로컬 레이아웃 읽지 않음 */
  readOnly?: boolean;
};

function normalizeLegacyLayout(
  instances: StickerInstance[],
  canEdit: boolean,
  roomId: string
): StickerInstance[] {
  if (!canEdit || !isLegacyPackedDefaultLayout(instances)) return instances;
  void clearLocalDioramaLayout(roomId);
  return [];
}

/**
 * 집 스티커 배치 — 기기 로컬 전용 (서버·다른 유저와 공유 없음)
 */
export async function loadStickerInstances(
  roomId: string,
  options?: StickerStorageOptions
): Promise<LoadStickerResult> {
  if (typeof window === "undefined") {
    return { instances: [], canEdit: false };
  }

  if (options?.readOnly) {
    return { instances: [], canEdit: false };
  }

  const local = await loadLocalDioramaLayout(roomId);
  if (!local?.length) {
    return { instances: [], canEdit: true };
  }

  return {
    instances: normalizeLegacyLayout(local, true, roomId),
    canEdit: true,
  };
}

export async function saveStickerInstances(
  roomId: string,
  instances: StickerInstance[],
  options?: StickerStorageOptions & { canEdit?: boolean }
): Promise<void> {
  if (typeof window === "undefined") return;
  const canEdit = options?.canEdit ?? !options?.readOnly;
  if (!canEdit || options?.readOnly) return;
  await saveLocalDioramaLayout(roomId, instances);
}

/** @deprecated layoutOwnerUserId — 로컬 집만 사용. readOnly 옵션 사용 */
export async function clearStickerInstances(roomId: string): Promise<void> {
  await clearLocalDioramaLayout(roomId);
}
