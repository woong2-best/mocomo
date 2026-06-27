import {
  getAptDioramaLayout,
  saveAptDioramaLayout,
} from "@/actions/apt-diorama";
import { isLegacyPackedDefaultLayout } from "@/lib/diorama/living-room-preset";
import type { StickerInstance } from "./sticker-types";

const STORAGE_PREFIX = "mocomo:sticker-instances";

function storageKey(userId: string | null, roomId: string): string {
  return `${STORAGE_PREFIX}:${userId ?? "guest"}:${roomId}`;
}

function loadFromLocal(userId: string | null, roomId: string): StickerInstance[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId, roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StickerInstance[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cacheToLocal(userId: string | null, roomId: string, instances: StickerInstance[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId, roomId), JSON.stringify(instances));
  } catch {
    /* quota */
  }
}

function normalizeLegacyLayout(
  instances: StickerInstance[],
  canEdit: boolean,
  layoutOwnerUserId: string,
  roomId: string
): StickerInstance[] {
  if (!canEdit || !isLegacyPackedDefaultLayout(instances)) return instances;
  cacheToLocal(layoutOwnerUserId, roomId, []);
  void saveAptDioramaLayout(roomId, []);
  return [];
}

export type LoadStickerResult = {
  instances: StickerInstance[];
  canEdit: boolean;
};

/**
 * 서버 DB 우선 로드. localStorage는 오프라인 캐시·비로그인 테스트용.
 */
export async function loadStickerInstances(
  layoutOwnerUserId: string | null,
  roomId: string
): Promise<LoadStickerResult> {
  if (typeof window === "undefined") {
    return { instances: [], canEdit: false };
  }

  if (!layoutOwnerUserId) {
    return { instances: loadFromLocal(null, roomId) ?? [], canEdit: true };
  }

  try {
    const { instances, canEdit, hasLayout, error } = await getAptDioramaLayout(
      layoutOwnerUserId,
      roomId
    );

    if (hasLayout) {
      const normalized = normalizeLegacyLayout(instances, canEdit, layoutOwnerUserId, roomId);
      cacheToLocal(layoutOwnerUserId, roomId, normalized);
      return { instances: normalized, canEdit };
    }

    const local = loadFromLocal(layoutOwnerUserId, roomId);
    if (local && canEdit && !error) {
      const normalized = normalizeLegacyLayout(local, true, layoutOwnerUserId, roomId);
      if (normalized.length > 0) {
        void saveAptDioramaLayout(roomId, normalized);
      } else if (local.length > 0) {
        void saveAptDioramaLayout(roomId, []);
      }
      return { instances: normalized, canEdit: true };
    }

    if (error && local) {
      return { instances: local, canEdit: false };
    }

    return { instances: [], canEdit };
  } catch {
    return {
      instances: loadFromLocal(layoutOwnerUserId, roomId) ?? [],
      canEdit: true,
    };
  }
}

export async function saveStickerInstances(
  layoutOwnerUserId: string | null,
  roomId: string,
  instances: StickerInstance[],
  options?: { canEdit?: boolean }
): Promise<void> {
  if (typeof window === "undefined") return;
  const canEdit = options?.canEdit ?? true;
  if (!canEdit) return;

  cacheToLocal(layoutOwnerUserId, roomId, instances);

  if (!layoutOwnerUserId) return;

  void saveAptDioramaLayout(roomId, instances).catch(() => {
    /* 네트워크 실패 시 localStorage 캐시만 유지 */
  });
}

export async function clearStickerInstances(
  userId: string | null,
  roomId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(userId, roomId));
}
