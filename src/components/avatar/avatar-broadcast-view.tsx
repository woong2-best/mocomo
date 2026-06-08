"use client";

import { useEffect, useRef, useState } from "react";
import { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import { useVirtualAvatarStudio } from "@/hooks/use-virtual-avatar-studio";
import { Loader2, ScanFace } from "lucide-react";
import { cn } from "@/lib/utils";

export type BroadcastBgMode = "normal" | "transparent" | "chroma";

export function AvatarBroadcastView({ bgMode = "transparent" }: { bgMode?: BroadcastBgMode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VirtualAvatar3DScene | null>(null);
  const studio = useVirtualAvatarStudio();
  const configRef = useRef(studio.config);
  configRef.current = studio.config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;

  const syncRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !studio.loaded) return;

    const scene = new VirtualAvatar3DScene(host);
    scene.setBroadcastMode(bgMode);
    sceneRef.current = scene;

    scene.start(() => configRef.current, () => {
      if (!syncRef.current || !faceTracking.active) return null;
      return getFrameRef.current();
    });

    setReady(true);

    return () => {
      scene.stop();
      sceneRef.current = null;
      setReady(false);
    };
  }, [studio.loaded, bgMode]);

  useEffect(() => {
    if (!ready || syncRef.current) return;
    syncRef.current = true;
    void faceTracking.start();
    return () => {
      syncRef.current = false;
      faceTracking.stop();
    };
  }, [ready, faceTracking]);

  return (
    <div className="relative w-full h-full min-h-[100dvh] overflow-hidden bg-black">
      <div ref={hostRef} className="absolute inset-0" />

      {faceTracking.starting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-white/80">카메라 연결 중…</p>
        </div>
      )}

      {faceTracking.faceDetected && (
        <span className="absolute top-3 left-3 z-10 live-badge">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          VTUBER
        </span>
      )}

      {faceTracking.error && (
        <p className="absolute bottom-3 left-3 right-3 text-center text-xs text-red-300 z-10">
          {faceTracking.error}
        </p>
      )}

      <p
        className={cn(
          "absolute bottom-3 right-3 text-[10px] z-10 pointer-events-none",
          bgMode === "chroma" ? "text-black/50" : "text-white/40"
        )}
      >
        OBS Browser Source · {bgMode === "chroma" ? "Chroma Key #00FF00" : "Transparent"}
      </p>
    </div>
  );
}
