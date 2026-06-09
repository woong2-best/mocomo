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
  AVATAR_MOCAP_STREAM_KEY,
  AVATAR_PRESET_STORAGE_KEY,
  AVATAR_VRM_SLOT_EVENT,
  loadAvatarPresetFromStorage,
  subscribeAvatarPresetSync,
} from "@/lib/virtual-avatar/avatar-preset-sync";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from "@/lib/virtual-avatar/types";

export type LiveAvatarLayout = "avatar" | "camera-bg";
export type LiveAvatarBackground = "gradient" | "chroma";

export type LiveAvatarTrackingStatus = {
  face: boolean;
  body: boolean;
  hands: boolean;
  active: boolean;
};

export type LiveAvatarPublishHandle = {
  getPublishStream: () => MediaStream | null;
  getPreviewCanvas: () => HTMLCanvasElement | null;
  waitForReady: () => Promise<void>;
  attachCameraStream: (stream: MediaStream) => Promise<void>;
  detachCameraStream: () => void;
  setLayout: (layout: LiveAvatarLayout) => void;
  setBackground: (mode: LiveAvatarBackground) => void;
  setCameraVisible: (visible: boolean) => void;
  setOverlayState: (state: LiveOverlayState | null) => void;
  isFaceDetected: () => boolean;
  getTrackingStatus: () => LiveAvatarTrackingStatus;
};

const VTUBER_CAPTURE = { w: 1920, h: 1080 };

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
  const backgroundRef = useRef<LiveAvatarBackground>("gradient");
  const cameraVisibleRef = useRef(true);
  const overlayRef = useRef<LiveOverlayState | null>(overlayState);
  const frameCountRef = useRef(0);

  const [config, setConfig] = useState<AvatarConfig>(() => loadAvatarPresetFromStorage() ?? DEFAULT_AVATAR_CONFIG);
  const [presetReady, setPresetReady] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;
  const faceActiveRef = useRef(faceTracking.active);
  faceActiveRef.current = faceTracking.active;

  const [sceneMounted, setSceneMounted] = useState(false);

  overlayRef.current = overlayState;

  useEffect(() => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) setConfig(stored);
    setPresetReady(true);
    return subscribeAvatarPresetSync((next) => {
      setConfig(next);
    });
  }, []);

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
    compositor.setBackground(backgroundRef.current);
    compositor.start(avatarCanvas, camera, effectiveLayout());

    scene.setOnAfterRender(() => compositor.notifyAvatarFrame());

    const videoTrack = compositor.getStream()?.getVideoTracks()[0];
    const audioTracks = cameraStreamRef.current?.getAudioTracks() ?? [];
    if (!videoTrack) return null;

    publishStreamRef.current = new MediaStream([videoTrack, ...audioTracks]);
    return publishStreamRef.current;
  }, [effectiveLayout, stopPublishTracks]);

  const reloadAvatarAssets = useCallback(async () => {
    const stored = loadAvatarPresetFromStorage();
    if (stored) {
      setConfig(stored);
      configRef.current = stored;
    }
    sceneRef.current?.refreshExternalConfig();
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
    configRef.current = config;
    sceneRef.current?.refreshExternalConfig();
  }, [config]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AVATAR_PRESET_STORAGE_KEY || e.key?.startsWith("mocomo_avatar")) {
        void reloadAvatarAssets();
      }
    };
    const onVrm = () => {
      void reloadAvatarAssets();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(AVATAR_VRM_SLOT_EVENT, onVrm);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AVATAR_VRM_SLOT_EVENT, onVrm);
    };
  }, [reloadAvatarAssets]);

  useEffect(() => {
    if (!enabled || !presetReady) return;

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
          const mocapUrl = localStorage.getItem(AVATAR_MOCAP_STREAM_KEY);
          if (mocapUrl?.trim()) {
            void scene.connectMocapStream(mocapUrl.trim());
          } else {
            void scene.loadCachedMocapBvh();
          }
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
  }, [enabled, presetReady, faceTracking, rebuildPublishStream, stopPublishTracks]);

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
      setBackground: (mode: LiveAvatarBackground) => {
        backgroundRef.current = mode;
        compositorRef.current?.setBackground(mode);
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
      getTrackingStatus: () => ({
        face: faceTracking.faceDetected,
        body: faceTracking.bodyDetected,
        hands: faceTracking.handsDetected,
        active: faceTracking.active,
      }),
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
