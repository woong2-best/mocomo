"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { LiveAvatarCompositor } from "@/lib/live/live-avatar-compositor";
import { useVirtualAvatarStudio } from "@/hooks/use-virtual-avatar-studio";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";

export type LiveAvatarLayout = "avatar" | "camera-bg";

export type LiveAvatarPublishHandle = {
  getPublishStream: () => MediaStream | null;
  getPreviewCanvas: () => HTMLCanvasElement | null;
  waitForReady: () => Promise<void>;
  attachCameraStream: (stream: MediaStream) => Promise<void>;
  detachCameraStream: () => void;
  setLayout: (layout: LiveAvatarLayout) => void;
  isFaceDetected: () => boolean;
};

const VTUBER_HOST_SIZE = { w: 1280, h: 720 };

export const LiveAvatarPublishLayer = forwardRef<
  LiveAvatarPublishHandle,
  { enabled: boolean; layout?: LiveAvatarLayout }
>(function LiveAvatarPublishLayer({ enabled, layout = "avatar" }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VirtualAvatar3DScene | null>(null);
  const compositorRef = useRef<LiveAvatarCompositor | null>(null);
  const publishStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const layoutRef = useRef<LiveAvatarLayout>(layout);
  const frameCountRef = useRef(0);

  const studio = useVirtualAvatarStudio();
  const configRef = useRef(studio.config);
  configRef.current = studio.config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;

  const [sceneMounted, setSceneMounted] = useState(false);

  const stopPublishTracks = useCallback(() => {
    publishStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
    publishStreamRef.current = null;
    compositorRef.current?.stop();
    compositorRef.current = null;
  }, []);

  const rebuildPublishStream = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene?.isReady()) return null;

    stopPublishTracks();

    const avatarCanvas = scene.getCanvasElement();
    const camera = cameraStreamRef.current;
    const currentLayout = layoutRef.current;

    let videoTrack: MediaStreamTrack | undefined;

    if (currentLayout === "camera-bg" && camera?.getVideoTracks()[0]) {
      const compositor = new LiveAvatarCompositor();
      compositorRef.current = compositor;
      compositor.start(avatarCanvas, camera);
      videoTrack = compositor.getStream()?.getVideoTracks()[0];
    } else {
      videoTrack = scene.getCaptureStream(30).getVideoTracks()[0];
    }

    const audioTracks = camera?.getAudioTracks() ?? [];
    if (!videoTrack) return null;

    publishStreamRef.current = new MediaStream([videoTrack, ...audioTracks]);
    return publishStreamRef.current;
  }, [stopPublishTracks]);

  useEffect(() => {
    layoutRef.current = layout;
    if (sceneMounted) rebuildPublishStream();
  }, [layout, sceneMounted, rebuildPublishStream]);

  useEffect(() => {
    if (!enabled || !studio.loaded) return;

    const host = hostRef.current;
    if (!host) return;

    host.style.width = `${VTUBER_HOST_SIZE.w}px`;
    host.style.height = `${VTUBER_HOST_SIZE.h}px`;

    const scene = new VirtualAvatar3DScene(host);
    sceneRef.current = scene;
    frameCountRef.current = 0;

    scene.start(
      () => configRef.current,
      () => (faceTracking.active ? getFrameRef.current() : null)
    );

    const tickReady = () => {
      if (!sceneRef.current) return;
      if (scene.isReady()) {
        frameCountRef.current += 1;
        if (frameCountRef.current >= 3) {
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
      getPreviewCanvas: () => {
        if (layoutRef.current === "camera-bg") {
          return compositorRef.current?.canvas ?? null;
        }
        return sceneRef.current?.getCanvasElement() ?? null;
      },
      waitForReady: async () => {
        const timeoutMs = 20000;
        const start = performance.now();
        while (performance.now() - start < timeoutMs) {
          if (sceneRef.current?.isReady() && publishStreamRef.current) return;
          if (sceneRef.current?.isReady()) {
            rebuildPublishStream();
            if (publishStreamRef.current) {
              await new Promise<void>((r) => setTimeout(r, 150));
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
        rebuildPublishStream();
      },
      isFaceDetected: () => faceTracking.faceDetected,
    }),
    [faceTracking, rebuildPublishStream, stopPublishTracks]
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
