"use client";

import type { Flat2dAvatarMeta } from "@/lib/avatar-2d/types";

export {
  AVATAR_2D_CHANGED_EVENT,
  MOCOMO_2D_LIBRARY_NAME,
  addCharacterToLibrary,
  clearFlat2dAvatar,
  getActiveLibraryCharacterId,
  hasFlat2dAvatar,
  hasLibraryCharacters,
  listLibraryCharacters,
  loadFlat2dAvatarMeta,
  notifyAvatar2dChanged,
  setActiveLibraryCharacter,
} from "@/lib/avatar-2d/library";

/** @deprecated — addCharacterToLibrary 사용 */
export async function saveFlat2dAvatarMeta(_meta: Flat2dAvatarMeta, _pngBlob: Blob) {
  const { notifyAvatar2dChanged } = await import("@/lib/avatar-2d/library");
  notifyAvatar2dChanged();
}
