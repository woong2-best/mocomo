"use client";

import { useEffect, useRef, useState } from "react";
import { Flat2dAvatarScene } from "@/lib/avatar-2d/flat-2d-scene";
import { hasFlat2dAvatar } from "@/lib/avatar-2d/storage";
import { AVATAR_2D_CHANGED_EVENT, MOCOMO_2D_LIBRARY_NAME } from "@/lib/avatar-2d/storage";

export function Avatar2dPreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hasAvatar, setHasAvatar] = useState(false);

  useEffect(() => {
    const refresh = () => setHasAvatar(hasFlat2dAvatar());
    refresh();
    window.addEventListener(AVATAR_2D_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AVATAR_2D_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !hasAvatar) return;

    host.replaceChildren();
    const scene = new Flat2dAvatarScene(host);
    scene.start(() => null, () => null);

    return () => {
      scene.dispose();
    };
  }, [hasAvatar]);

  if (!hasAvatar) {
    return (
      <p className="text-xs text-muted-foreground text-center py-8">
        {MOCOMO_2D_LIBRARY_NAME}가 비어 있습니다.
        <br />
        그리기 또는 업로드 후 저장하면 여기에 쌓입니다.
      </p>
    );
  }

  return (
    <div
      ref={hostRef}
      className="aspect-square w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-[hsl(var(--folk-cobalt)/0.08)]"
    />
  );
}
