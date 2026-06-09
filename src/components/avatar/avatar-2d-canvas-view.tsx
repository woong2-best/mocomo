"use client";

import { useEffect, useRef } from "react";
import { VirtualAvatarRenderer } from "@/lib/virtual-avatar/renderer";
import { PhotoAvatarScene } from "@/lib/photo-avatar/photo-avatar-scene";
import { usePhotoAvatarMode } from "@/hooks/use-photo-avatar-mode";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";

export function Avatar2dCanvasView({ studio }: { studio: VirtualAvatarStudioState }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(studio.config);
  configRef.current = studio.config;
  const { isPhotoMode } = usePhotoAvatarMode();
  const faceTracking = useAvatarFaceTracking();
  const syncEnabledRef = useRef(false);
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;

  useEffect(() => {
    syncEnabledRef.current = faceTracking.active;
  }, [faceTracking.active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();

    if (isPhotoMode) {
      const scene = new PhotoAvatarScene(host);
      scene.start(
        () => configRef.current,
        () => {
          if (!syncEnabledRef.current || !faceTracking.active) return null;
          return getFrameRef.current();
        }
      );
      const onReload = () => void scene.reloadFromStorage();
      window.addEventListener("mocomo-photo-avatar-reload", onReload);
      return () => {
        window.removeEventListener("mocomo-photo-avatar-reload", onReload);
        scene.stop();
        scene.dispose();
      };
    }

    const canvas = document.createElement("canvas");
    canvas.className = "w-full h-full block";
    host.appendChild(canvas);
    const renderer = new VirtualAvatarRenderer(canvas);
    renderer.start(() => configRef.current);
    return () => renderer.stop();
  }, [isPhotoMode, faceTracking.active]);

  return (
    <div className="live-studio-panel flex flex-col min-h-0 overflow-hidden lg:col-span-6">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/60 shrink-0">
        <p className="text-xs font-semibold text-folk-cobalt">2D 미리보기</p>
        <p className="text-[10px] text-muted-foreground">
          {isPhotoMode ? "사진 아바타" : "캔버스 아바타"}
        </p>
      </div>
      <div
        ref={hostRef}
        className="relative flex-1 min-h-[280px] sm:min-h-[360px] bg-[hsl(var(--folk-cobalt)/0.06)]"
      />
    </div>
  );
}
