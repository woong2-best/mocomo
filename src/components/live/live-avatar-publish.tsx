"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { LiveOverlayState } from "@/lib/live-overlays/types";
import { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { LiveAvatarCompositor } from "@/lib/live/live-avatar-compositor";
import {
  AVATAR_PRESET_STORAGE_KEY,
  AVATAR_UPDATED_EVENT,
  useVirtualAvatarStudio,
} from "@/hooks/use-virtual-avatar-studio";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { DEFAULT_AVATAR_CONFIG } from "@/lib/virtual-avatar/types";

export type LiveAvatarLayout = "avatar" | "camera-bg";

export type LiveAvatarPublishHandle = {
  getPublishStream: () => MediaStream | null;
  getPreviewCanvas: () => HTMLCanvasElement | null;
  waitForReady: () => Promise<void>;
  attachCameraStream: (stream: MediaStream) => Promise<void>;
  detachCameraStream: () => void;
  setLayout: (layout: LiveAvatarLayout) => void;
  setCameraVisible: (visible: boolean) => void;
  setOverlayState: (state: LiveOverlayState | null) => void;
  isFaceDetected: () => boolean;
};

const VTUBER_CAPTURE = { w: 1920, h: 1080 };

function mergeStoredConfig(parsed: Partial<AvatarConfig>): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    ...parsed,
    body: { ...DEFAULT_AVATAR_CONFIG.body, ...parsed.body },
    face: {
      ...DEFAULT_AVATAR_CONFIG.face,
      ...parsed.face,
      makeup: { ...DEFAULT_AVATAR_CONFIG.face.makeup, ...parsed.face?.makeup },
    },
    skin: { ...DEFAULT_AVATAR_CONFIG.skin, ...parsed.skin },
    outfit: { ...DEFAULT_AVATAR_CONFIG.outfit, ...parsed.outfit },
    hair: { ...DEFAULT_AVATAR_CONFIG.hair, ...parsed.hair },
    effects: { ...DEFAULT_AVATAR_CONFIG.effects, ...parsed.effects },
    view: { ...DEFAULT_AVATAR_CONFIG.view, ...parsed.view },
    equipped: { ...DEFAULT_AVATAR_CONFIG.equipped, ...parsed.equipped },
    paint: parsed.paint ?? DEFAULT_AVATAR_CONFIG.paint,
    sculpt: parsed.sculpt ?? DEFAULT_AVATAR_CONFIG.sculpt,
  };
}

function loadConfigFromStorage(): AvatarConfig | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(AVATAR_PRESET_STORAGE_KEY) ??
    localStorage.getItem("mocomo_avatar_preset_v1");
  if (!raw) return null;
  try {
    return mergeStoredConfig(JSON.parse(raw) as Partial<AvatarConfig>);
  } catch {
    return null;
  }
}

export const LiveAvatarPublishLayer = forwardRef<
  LiveAvatarPublishHandle,
  {
    enabled: boolean;
    layout?: LiveAvatarLayout;
    overlayState?: LiveOverlayState | null;
  }
>(function LiveAvatarPublishLayer({ enabled, layout = "avatar", overlayState = null }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VirtualAvatar3DScene | null>(null);
  const compositorRef = useRef<LiveAvatarCompositor | null>(null);
  const publishStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const layoutRef = useRef<LiveAvatarLayout>(layout);
  const cameraVisibleRef = useRef(true);
  const overlayRef = useRef<LiveOverlayState | null>(overlayState);
  const frameCountRef = useRef(0);

  const studio = useVirtualAvatarStudio();
  const configRef = useRef(studio.config);
  configRef.current = studio.config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;
  const faceActiveRef = useRef(faceTracking.active);
  faceActiveRef.current = faceTracking.active;

  const [sceneMounted, setSceneMounted] = useState(false);

  overlayRef.current = overlayState;

  const stopPublishTracks = useCallback(() => {
    publishStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
    publishStreamRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;
  }, []);

  const effectiveLayout = useCallback((): LiveAvatarLayout => {
    if (layoutRef.current === "camera-bg" && cameraVisibleRef.current) return "camera-bg";
    return "avatar";
  }, []);

  const rebuildPublishStream = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene?.isReady()) return null;

    stopPublishTracks();

    const avatarCanvas = scene.getCanvasElement();
    const camera = cameraVisibleRef.current ? cameraStreamRef.current : null;
    const compositor = new LiveAvatarCompositor(VTUBER_CAPTURE.w, VTUBER_CAPTURE.h);
    compositorRef.current = compositor;
    compositor.setOverlayState(overlayRef.current);
    compositor.setLayout(effectiveLayout());
    compositor.start(avatarCanvas, camera, effectiveLayout());

    scene.setOnAfterRender(() => compositor.notifyAvatarFrame());

    const videoTrack = compositor.getStream()?.getVideoTracks()[0];
    const audioTracks = cameraStreamRef.current?.getAudioTracks() ?? [];
    if (!videoTrack) return null;

    publishStreamRef.current = new MediaStream([videoTrack, ...audioTracks]);
    return publishStreamRef.current;
  }, [effectiveLayout, stopPublishTracks]);

  const reloadAvatarAssets = useCallback(async () => {
    const stored = loadConfigFromStorage();
    if (stored) configRef.current = stored;
    await sceneRef.current?.reloadActiveVrmFromStorage();
    sceneRef.current?.fitVtuberBroadcastView?.();
    if (sceneMounted) rebuildPublishStream();
  }, [rebuildPublishStream, sceneMounted]);

  useEffect(() => {
    layoutRef.current = layout;
    compositorRef.current?.setLayout(effectiveLayout());
    if (sceneMounted) rebuildPublishStream();
  }, [layout, sceneMounted, rebuildPublishStream, effectiveLayout]);

  useEffect(() => {
    overlayRef.current = overlayState;
    compositorRef.current?.setOverlayState(overlayState ?? null);
  }, [overlayState]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AVATAR_PRESET_STORAGE_KEY || e.key?.startsWith("mocomo_avatar")) {
        void reloadAvatarAssets();
      }
    };
    const onUpdated = () => {
      void reloadAvatarAssets();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(AVATAR_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AVATAR_UPDATED_EVENT, onUpdated);
    };
  }, [reloadAvatarAssets]);

  useEffect(() => {
    if (!enabled || !studio.loaded) return;

    const host = hostRef.current;
    if (!host) return;

    host.style.width = `${VTUBER_CAPTURE.w}px`;
    host.style.height = `${VTUBER_CAPTURE.h}px`;

    const scene = new VirtualAvatar3DScene(host);
    sceneRef.current = scene;
    frameCountRef.current = 0;
    scene.setLiveCaptureMode(true);

    scene.start(
      () => configRef.current,
      () => (faceActiveRef.current ? getFrameRef.current() : null)
    );

    const tickReady = () => {
      if (!sceneRef.current) return;
      if (scene.isReady()) {
        frameCountRef.current += 1;
        if (frameCountRef.current >= 4) {
          scene.fitVtuberBroadcastView();
          setSceneMounted(true);
          rebuildPublishStream();
          return;
        }
      }
      requestAnimationFrame(tickReady);
    };
    requestAnimationFrame(tickReady);

    return () => {
      setSceneMounted(false);
      frameCountRef.current = 0;
      scene.setOnAfterRender(null);
      faceTracking.detachExternalStream();
      cameraStreamRef.current = null;
      stopPublishTracks();
      scene.stop();
      sceneRef.current = null;
    };
  }, [enabled, studio.loaded, faceTracking, rebuildPublishStream, stopPublishTracks]);

  useImperativeHandle(
    ref,
    () => ({
      getPublishStream: () => publishStreamRef.current ?? rebuildPublishStream(),
      getPreviewCanvas: () => compositorRef.current?.getCanvas() ?? sceneRef.current?.getCanvasElement() ?? null,
      waitForReady: async () => {
        const timeoutMs = 25000;
        const start = performance.now();
        while (performance.now() - start < timeoutMs) {
          if (sceneRef.current?.isReady() && publishStreamRef.current) return;
          if (sceneRef.current?.isReady()) {
            rebuildPublishStream();
            if (publishStreamRef.current) {
              await new Promise<void>((r) => setTimeout(r, 200));
              return;
            }
          }
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
        throw new Error("VTuber 아바타 준비 시간이 초과되었습니다.");
      },
      attachCameraStream: async (stream: MediaStream) => {
        cameraStreamRef.current = stream;
        await faceTracking.attachExternalStream(stream);
        rebuildPublishStream();
      },
      detachCameraStream: () => {
        faceTracking.detachExternalStream();
        cameraStreamRef.current = null;
        stopPublishTracks();
      },
      setLayout: (next: LiveAvatarLayout) => {
        layoutRef.current = next;
        compositorRef.current?.setLayout(effectiveLayout());
        rebuildPublishStream();
      },
      setCameraVisible: (visible: boolean) => {
        cameraVisibleRef.current = visible;
        compositorRef.current?.setLayout(effectiveLayout());
        rebuildPublishStream();
      },
      setOverlayState: (state: LiveOverlayState | null) => {
        overlayRef.current = state;
        compositorRef.current?.setOverlayState(state);
      },
      isFaceDetected: () => faceTracking.faceDetected,
    }),
    [effectiveLayout, faceTracking, rebuildPublishStream, stopPublishTracks]
  );

  if (!enabled) return null;

  return (
    <div
      ref={hostRef}
      className="fixed left-[-9999px] top-0 overflow-hidden pointer-events-none opacity-0"
      aria-hidden
    />
  );
});
