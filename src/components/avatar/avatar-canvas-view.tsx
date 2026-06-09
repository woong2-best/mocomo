"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VirtualAvatar3DScene } from "@/lib/virtual-avatar/avatar-3d-scene";
import { PhotoAvatarScene } from "@/lib/photo-avatar/photo-avatar-scene";
import { usePhotoAvatarMode } from "@/hooks/use-photo-avatar-mode";
import type { VirtualAvatarStudioState } from "@/hooks/use-virtual-avatar-studio";
import { useAvatarFaceTracking } from "@/hooks/use-avatar-face-tracking";
import { cn } from "@/lib/utils";
import {
  Circle,
  Loader2,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  ScanFace,
  Square,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { MocapPreset } from "@/lib/virtual-avatar/face-tracking";
import { TrackingTimelineRecorder } from "@/lib/virtual-avatar/tracking/tracking-timeline";
import { AvatarCanvasRecorder } from "@/lib/virtual-avatar/avatar-recorder";
import { downloadBlob } from "@/lib/virtual-avatar/avatar-export";
import { AVATAR_MOCAP_STREAM_KEY } from "@/lib/virtual-avatar/avatar-preset-sync";
import { cacheBvhFile } from "@/lib/virtual-avatar/avatar-mocap-cache";

export function AvatarCanvasView({
  studio,
  onRendererReady,
}: {
  studio: VirtualAvatarStudioState;
  onRendererReady?: (renderer: VirtualAvatar3DScene | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<VirtualAvatar3DScene | PhotoAvatarScene | null>(null);
  const { isPhotoMode } = usePhotoAvatarMode();
  const configRef = useRef(studio.config);
  configRef.current = studio.config;

  const faceTracking = useAvatarFaceTracking();
  const getFrameRef = useRef(faceTracking.getFrame);
  getFrameRef.current = faceTracking.getFrame;
  const syncEnabledRef = useRef(false);

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [stats, setStats] = useState({ triangles: 0, fps: 60 });
  const [mocapPreset, setMocapPreset] = useState<MocapPreset | null>(null);
  const bvhInputRef = useRef<HTMLInputElement>(null);
  const fbxInputRef = useRef<HTMLInputElement>(null);
  const timelineInputRef = useRef<HTMLInputElement>(null);
  const timelineRecorderRef = useRef(new TrackingTimelineRecorder());
  const canvasRecorderRef = useRef(new AvatarCanvasRecorder());
  const [timelineRecording, setTimelineRecording] = useState(false);
  const [webmRecording, setWebmRecording] = useState(false);
  const [loadError, setLoadError] = useState("");

  const playMocap = useCallback((preset: MocapPreset) => {
    if (sceneRef.current instanceof VirtualAvatar3DScene) {
      sceneRef.current.playMocapPreset(preset);
    }
    setMocapPreset(preset);
  }, []);

  const stopMocap = useCallback(() => {
    if (sceneRef.current instanceof VirtualAvatar3DScene) {
      sceneRef.current.stopMocap();
    }
    setMocapPreset(null);
  }, []);

  const onBvhUpload = useCallback(async (file: File) => {
    if (!(sceneRef.current instanceof VirtualAvatar3DScene)) return;
    await cacheBvhFile(file);
    const ok = await sceneRef.current.loadMocapBvh(file);
    if (ok) setMocapPreset(null);
  }, []);

  const onFbxUpload = useCallback(async (file: File) => {
    if (!(sceneRef.current instanceof VirtualAvatar3DScene)) return;
    const ok = await sceneRef.current.loadMocapFbx(file);
    if (ok) setMocapPreset(null);
  }, []);

  const connectMocapStream = useCallback(async () => {
    if (!(sceneRef.current instanceof VirtualAvatar3DScene)) return;
    const url = window.prompt("WebSocket 모캡 URL (ws://localhost:8080 등)");
    if (!url?.trim()) return;
    localStorage.setItem(AVATAR_MOCAP_STREAM_KEY, url.trim());
    const ok = await sceneRef.current.connectMocapStream(url.trim());
    if (ok) setMocapPreset(null);
  }, []);

  syncEnabledRef.current = syncEnabled;

  const toggleSync = useCallback(async () => {
    if (syncEnabled) {
      setSyncEnabled(false);
      faceTracking.stop();
      return;
    }
    setSyncEnabled(true);
    await faceTracking.start();
  }, [faceTracking, syncEnabled]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();

    let scene: VirtualAvatar3DScene | PhotoAvatarScene;
    try {
      if (isPhotoMode) {
        const photoScene = new PhotoAvatarScene(host);
        scene = photoScene;
        sceneRef.current = photoScene;
        onRendererReady?.(null);
        photoScene.start(
          () => configRef.current,
          () => {
            if (!syncEnabledRef.current || !faceTracking.active) return null;
            return getFrameRef.current();
          }
        );
      } else {
        const vrmScene = new VirtualAvatar3DScene(host);
        scene = vrmScene;
        sceneRef.current = vrmScene;
        onRendererReady?.(vrmScene);
        vrmScene.start(
          () => configRef.current,
          () => {
            if (!syncEnabledRef.current || !faceTracking.active) return null;
            return getFrameRef.current();
          }
        );
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "아바타 초기화 실패");
      return;
    }

    const statTimer = window.setInterval(() => {
      const s = sceneRef.current;
      if (s && "getStats" in s) setStats(s.getStats());
    }, 500);

    const onReload = () => {
      if (isPhotoMode && sceneRef.current instanceof PhotoAvatarScene) {
        void sceneRef.current.reloadFromStorage();
      }
    };
    window.addEventListener("mocomo-photo-avatar-reload", onReload);

    return () => {
      window.removeEventListener("mocomo-photo-avatar-reload", onReload);
      window.clearInterval(statTimer);
      scene.stop();
      if (scene instanceof PhotoAvatarScene) scene.dispose();
      sceneRef.current = null;
      onRendererReady?.(null);
    };
  }, [onRendererReady, isPhotoMode]);

  useEffect(() => {
    if (!syncEnabled || !timelineRecording) return;
    const id = window.setInterval(() => {
      const frame = getFrameRef.current();
      if (frame.detected) timelineRecorderRef.current.push(frame);
    }, 33);
    return () => window.clearInterval(id);
  }, [syncEnabled, timelineRecording]);

  const { config, resetView, zoomIn, zoomOut, toggleAutoRotate, toggleAnimation } = studio;

  const syncStatus = !syncEnabled
    ? "실시간 연동 버튼을 눌러 내 얼굴로 아바타를 움직여 보세요"
    : faceTracking.starting
      ? "카메라 연결 중…"
      : faceTracking.error
        ? faceTracking.error
        : faceTracking.landmarkerState === "loading"
          ? "얼굴 인식 준비 중…"
          : faceTracking.faceDetected
            ? `연동 · 얼굴${faceTracking.blendShapeCount || 52}ch${
                faceTracking.bodyDetected ? " · 상체" : ""
              }${faceTracking.legsDetected ? " · 하체" : ""}${
                faceTracking.handsDetected ? " · 손" : ""
              }${faceTracking.voiceActive ? " · 음성" : ""}${
                faceTracking.speechLipActive ? " · STT립" : ""
              }${faceTracking.aiLipActive ? " · AI립" : ""}`
            : "카메라 앞에 얼굴을 맞춰 주세요";

  return (
    <div className="relative flex flex-col min-h-0 lg:col-span-6 live-studio-panel overflow-hidden">
      <div className="px-4 py-2.5 border-b-2 border-[hsl(var(--folk-cobalt)/0.12)] bg-folk-gold/10 shrink-0 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-display font-bold text-folk-cobalt">3D 미리보기</h2>
          <p
            className={cn(
              "text-[10px] truncate mt-0.5",
              syncEnabled && faceTracking.faceDetected
                ? "text-folk-forest font-semibold"
                : "text-muted-foreground"
            )}
          >
            {syncStatus}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleSync()}
          disabled={faceTracking.starting}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold border-2 transition-all",
            syncEnabled
              ? "bg-folk-terracotta text-white border-folk-terracotta shadow-folk-sm"
              : "bg-card text-folk-cobalt border-[hsl(var(--folk-cobalt)/0.2)] hover:bg-muted"
          )}
        >
          {faceTracking.starting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ScanFace className="h-3.5 w-3.5" />
          )}
          실시간 연동
        </button>
      </div>

      <div className="relative flex-1 min-h-[360px] lg:min-h-0 bg-[hsl(var(--folk-cobalt)/0.08)]">
        <div ref={hostRef} className="absolute inset-0" />

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {loadError}
          </div>
        )}

        {syncEnabled && faceTracking.error && (
          <div className="absolute top-3 left-3 right-3 z-10 rounded-xl border-2 border-folk-terracotta/30 bg-background/95 px-3 py-2 text-[11px] text-muted-foreground shadow-folk-sm">
            {faceTracking.error}
          </div>
        )}

        {syncEnabled && faceTracking.faceDetected && (
          <span className="live-badge absolute top-3 left-3 z-10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SYNC
          </span>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-background/95 border-2 border-[hsl(var(--folk-cobalt)/0.2)] shadow-folk backdrop-blur-sm max-w-[calc(100%-1rem)] overflow-x-auto">
          <ToolbarBtn active={config.view.autoRotate} title="자동 회전" onClick={toggleAutoRotate}>
            <RotateCw className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="줌 인" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="줌 아웃" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            title="뷰 리셋"
            onClick={() => {
              resetView();
              if (sceneRef.current instanceof VirtualAvatar3DScene) {
                sceneRef.current.fitFullBodyView();
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn
            active={config.effects.animationPlaying}
            title={config.effects.animationPlaying ? "애니메이션 정지" : "애니메이션 재생"}
            onClick={toggleAnimation}
          >
            {config.effects.animationPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </ToolbarBtn>
          <ToolbarBtn
            active={mocapPreset === "wave"}
            title="모션 · 손 흔들기"
            onClick={() => (mocapPreset === "wave" ? stopMocap() : playMocap("wave"))}
          >
            <span className="text-[10px] font-bold">👋</span>
          </ToolbarBtn>
          <ToolbarBtn
            active={mocapPreset === "bow"}
            title="모션 · 인사"
            onClick={() => (mocapPreset === "bow" ? stopMocap() : playMocap("bow"))}
          >
            <span className="text-[10px] font-bold">🙇</span>
          </ToolbarBtn>
          <ToolbarBtn
            active={mocapPreset === "walk"}
            title="모션 · 걷기"
            onClick={() => (mocapPreset === "walk" ? stopMocap() : playMocap("walk"))}
          >
            <span className="text-[10px] font-bold">🚶</span>
          </ToolbarBtn>
          <ToolbarBtn title="BVH 모캡" onClick={() => bvhInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn title="FBX 모캡" onClick={() => fbxInputRef.current?.click()}>
            <span className="text-[9px] font-bold">FBX</span>
          </ToolbarBtn>
          <ToolbarBtn title="WebSocket 모캡 스트림" onClick={() => void connectMocapStream()}>
            <span className="text-[10px] font-bold">📡</span>
          </ToolbarBtn>
          <ToolbarBtn
            active={timelineRecording}
            title="트래킹 녹화"
            onClick={() => {
              if (timelineRecording) {
                timelineRecorderRef.current.stop();
                setTimelineRecording(false);
                downloadBlob(
                  timelineRecorderRef.current.exportJson(),
                  `mocomo-tracking-${Date.now()}.json`
                );
              } else {
                timelineRecorderRef.current.start();
                setTimelineRecording(true);
              }
            }}
          >
            <Circle className={cn("h-3.5 w-3.5", timelineRecording && "text-red-500 fill-red-500")} />
          </ToolbarBtn>
          <ToolbarBtn
            title="트래킹 JSON 재생"
            onClick={() => timelineInputRef.current?.click()}
          >
            <Play className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={webmRecording}
            title="WebM 녹화"
            onClick={() => {
              void (async () => {
                const canvas = sceneRef.current?.getCanvasElement();
                if (!canvas) return;
                if (webmRecording) {
                  const blob = await canvasRecorderRef.current.stop();
                  setWebmRecording(false);
                  if (blob) downloadBlob(blob, `mocomo-avatar-${Date.now()}.webm`);
                } else {
                  const ok = canvasRecorderRef.current.start(canvas);
                  setWebmRecording(ok);
                }
              })();
            }}
          >
            <Square className={cn("h-3 w-3", webmRecording && "text-red-500 fill-red-500")} />
          </ToolbarBtn>
          <input
            ref={bvhInputRef}
            type="file"
            accept=".bvh"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onBvhUpload(file);
              e.target.value = "";
            }}
          />
          <input
            ref={timelineInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (sceneRef.current instanceof VirtualAvatar3DScene) {
                  void sceneRef.current.loadTrackingTimeline(file);
                }
                stopMocap();
              }
              e.target.value = "";
            }}
          />
          <input
            ref={fbxInputRef}
            type="file"
            accept=".fbx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFbxUpload(file);
              e.target.value = "";
            }}
          />
          <ToolbarBtn
            title="전체화면"
            onClick={() => {
              hostRef.current?.requestFullscreen?.().catch(() => undefined);
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </ToolbarBtn>
        </div>

        <p className="absolute bottom-14 left-3 text-[10px] text-white/70 z-10 pointer-events-none">
          실시간 연동: 고개·표정 · 드래그: 회전 · 휠: 줌
        </p>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition-all shrink-0",
        active
          ? "bg-folk-terracotta text-white shadow-folk-sm"
          : "text-folk-cobalt hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
