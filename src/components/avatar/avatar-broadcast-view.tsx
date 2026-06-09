"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { PhotoAvatarScene } from "@/lib/photo-avatar/photo-avatar-scene";
import { usePhotoAvatarMode } from "@/hooks/use-photo-avatar-mode";
import { PHOTO_AVATAR_CHANGED_EVENT } from "@/lib/photo-avatar/photo-avatar-storage";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from "@/lib/virtual-avatar/types";
import {
  AVATAR_MOCAP_STREAM_KEY,
  AVATAR_PRESET_STORAGE_KEY,
  AVATAR_VRM_SLOT_EVENT,
  loadAvatarPresetFromStorage,
  subscribeAvatarPresetSync,
} from "@/lib/virtual-avatar/avatar-preset-sync";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BroadcastBgMode = "normal" | "transparent" | "chroma";

async function attachOptionalMocap(scene: VirtualAvatar3DScene) {
  const ws = localStorage.getItem(AVATAR_MOCAP_STREAM_KEY);
  if (ws?.trim()) {
    const ok = await scene.connectMocapStream(ws.trim());
    if (ok) return;
  }
  await scene.loadCachedMocapBvh();
}

export function AvatarBroadcastView({ bgMode = "transparent" }: { bgMode?: BroadcastBgMode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VirtualAvatar3DScene | PhotoAvatarScene | null>(null);
  const { isPhotoMode } = usePhotoAvatarMode();
  const syncRef = useRef(true);

  const [config, setConfig] = useState<AvatarConfig>(() => loadAvatarPresetFromStorage() ?? DEFAULT_AVATAR_CONFIG);
  const [presetReady, setPresetReady] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;
  const faceActiveRef = useRef(faceTracking.active);
  faceActiveRef.current = faceTracking.active;

  const [sceneReady, setSceneReady] = useState(false);

  const reloadFromSync = useCallback(async () => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) {
      setConfig(stored);
      configRef.current = stored;
    }
    sceneRef.current?.refreshExternalConfig?.();
    if (sceneRef.current instanceof VirtualAvatar3DScene) {
      await sceneRef.current.reloadActiveVrmFromStorage();
      sceneRef.current.fitVtuberBroadcastView?.();
      await attachOptionalMocap(sceneRef.current);
    } else if (sceneRef.current instanceof PhotoAvatarScene) {
      await sceneRef.current.reloadFromStorage();
      sceneRef.current.fitVtuberBroadcastView();
    }
  }, []);

  useEffect(() => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) setConfig(stored);
    setPresetReady(true);
    return subscribeAvatarPresetSync((next) => {
      setConfig(next);
      configRef.current = next;
      void reloadFromSync();
    });
  }, [reloadFromSync]);

  useEffect(() => {
    configRef.current = config;
    sceneRef.current?.refreshExternalConfig();
  }, [config]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AVATAR_PRESET_STORAGE_KEY || e.key?.startsWith("mocomo_avatar")) {
        void reloadFromSync();
      }
    };
    const onVrm = () => void reloadFromSync();
    window.addEventListener("storage", onStorage);
    window.addEventListener(AVATAR_VRM_SLOT_EVENT, onVrm);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AVATAR_VRM_SLOT_EVENT, onVrm);
    };
  }, [reloadFromSync]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !presetReady) return;

    host.replaceChildren();

    const scene = isPhotoMode ? new PhotoAvatarScene(host) : new VirtualAvatar3DScene(host);
    if (scene instanceof VirtualAvatar3DScene) {
      scene.setBroadcastMode(bgMode);
    }
    sceneRef.current = scene;

    scene.start(
      () => configRef.current,
      () => (syncRef.current && faceActiveRef.current ? getFrameRef.current() : null)
    );

    let cancelled = false;
    const waitReady = () => {
      if (cancelled || !sceneRef.current) return;
      if (scene.isReady()) {
        scene.fitVtuberBroadcastView();
        if (scene instanceof VirtualAvatar3DScene) {
          void attachOptionalMocap(scene).finally(() => {
            if (!cancelled) setSceneReady(true);
          });
        } else {
          setSceneReady(true);
        }
        return;
      }
      requestAnimationFrame(waitReady);
    };
    requestAnimationFrame(waitReady);

    return () => {
      cancelled = true;
      syncRef.current = false;
      faceTracking.stop();
      scene.stop();
      if (scene instanceof PhotoAvatarScene) scene.dispose();
      sceneRef.current = null;
      setSceneReady(false);
    };
  }, [presetReady, bgMode, isPhotoMode, faceTracking.stop]);

  useEffect(() => {
    if (!sceneReady) return;
    syncRef.current = true;
    void faceTracking.start();
    return () => {
      syncRef.current = false;
      faceTracking.stop();
    };
  }, [sceneReady, faceTracking]);

  const trackingLive =
    faceTracking.faceDetected || faceTracking.bodyDetected || faceTracking.handsDetected;

  return (
    <div className="relative w-full h-full min-h-[100dvh] overflow-hidden bg-black">
      <div ref={hostRef} className="absolute inset-0" />

      {(faceTracking.starting || !sceneReady) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-sm text-white/80">아바타 · 카메라 준비 중…</p>
        </div>
      )}

      {trackingLive && (
        <span className="absolute top-3 left-3 z-10 live-badge">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {faceTracking.faceDetected ? "FACE" : ""}
          {faceTracking.bodyDetected ? " · BODY" : ""}
          {faceTracking.handsDetected ? " · HANDS" : ""}
        </span>
      )}

      {faceTracking.error && (
        <p className="absolute bottom-10 left-3 right-3 text-center text-xs text-red-300 z-10">
          {faceTracking.error}
        </p>
      )}

      <p
        className={cn(
          "absolute bottom-3 right-3 text-[10px] z-10 pointer-events-none",
          bgMode === "chroma" ? "text-black/50" : "text-white/40"
        )}
      >
        OBS Browser Source · 스튜디오 변경 자동 반영 ·{" "}
        {bgMode === "chroma" ? "Chroma #00FF00" : bgMode === "transparent" ? "Transparent" : "Normal"}
      </p>
    </div>
  );
}
