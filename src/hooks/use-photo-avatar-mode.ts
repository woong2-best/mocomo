"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPhotoAvatarRenderMode,
  PHOTO_AVATAR_CHANGED_EVENT,
  PHOTO_AVATAR_MODE_KEY,
} from "@/lib/photo-avatar/photo-avatar-storage";
import type { PhotoAvatarRenderMode } from "@/lib/photo-avatar/types";

export function usePhotoAvatarMode() {
  const [mode, setMode] = useState<PhotoAvatarRenderMode>(() =>
    typeof window !== "undefined" ? getPhotoAvatarRenderMode() : "vrm"
  );

  const refresh = useCallback(() => {
    setMode(getPhotoAvatarRenderMode());
  }, []);

  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener(PHOTO_AVATAR_CHANGED_EVENT, onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PHOTO_AVATAR_MODE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PHOTO_AVATAR_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return { mode, isPhotoMode: mode === "photo", refresh };
}
