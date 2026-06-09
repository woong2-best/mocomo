"use client";

import { useEffect, useRef, useState } from "react";
import { Flat2dAvatarScene } from "@/lib/avatar-2d/flat-2d-scene";
import { hasFlat2dAvatar } from "@/lib/avatar-2d/storage";
import { AVATAR_2D_CHANGED_EVENT } from "@/lib/avatar-2d/storage";

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
        등록된 2D 아바타가 없습니다.
        <br />
        그리기 또는 업로드 후 「방송 적용」을 눌러 주세요.
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
