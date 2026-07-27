"use client";

import { useCallback, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { computeOutputDimensions, drawVideoFrame } from "@/lib/video-editor/draw-frame";
import { formatVideoTime } from "@/lib/video-editor/thumbnails";
import type { VideoEditState } from "@/lib/video-editor/types";
import { cn } from "@/lib/utils";

type VideoPreviewCanvasProps = {
  src: string | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  edit: VideoEditState;
  playing: boolean;
  stickerMode?: boolean;
  onTimeUpdate?: (sec: number) => void;
  onDuration?: (sec: number) => void;
  onTogglePlay?: () => void;
  onPlaceSticker?: (x: number, y: number) => void;
  onError?: () => void;
  className?: string;
};

export function VideoPreviewCanvas({
  src,
  videoRef: externalVideoRef,
  edit,
  playing,
  stickerMode,
  onTimeUpdate,
  onDuration,
  onTogglePlay,
  onPlaceSticker,
  onError,
  className,
}: VideoPreviewCanvasProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const vfcRef = useRef<number>(0);

  const redraw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const dims = computeOutputDimensions(
      video.videoWidth || 720,
      video.videoHeight || 1280,
      edit.rotation,
      edit.cropAspect
    );

    if (canvas.width !== dims.width || canvas.height !== dims.height) {
      canvas.width = dims.width;
      canvas.height = dims.height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawVideoFrame(ctx, video, edit, dims);
  }, [edit]);

  useEffect(() => {
    redraw();
  }, [redraw, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMeta = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        onDuration?.(video.duration);
      }
      redraw();
    };
    const onTime = () => {
      onTimeUpdate?.(video.currentTime);
      redraw();
    };

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("durationchange", onMeta);
    video.addEventListener("seeked", redraw);
    video.addEventListener("timeupdate", onTime);

    // src 교체 시 loadedmetadata가 이미 지난 뒤에 리스너가 붙는 경우 대비
    if (src && video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
      onMeta();
    }

    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("durationchange", onMeta);
      video.removeEventListener("seeked", redraw);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [src, onDuration, onTimeUpdate, redraw]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // requestVideoFrameCallback: 디코딩된 실제 프레임마다 그림 (검은 화면 방지)
    const hasVfc = typeof video.requestVideoFrameCallback === "function";

    if (playing) {
      const start = edit.startSec;
      const end = edit.endSec;
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start;
      }
      video.muted = edit.muted;
      video.volume = edit.volume;
      void video.play().catch(() => undefined);

      const stop = () => {
        video.pause();
        video.currentTime = start;
        redraw();
        onTogglePlay?.();
      };

      if (hasVfc) {
        const onFrame = () => {
          if (video.paused) return;
          if (video.currentTime >= end) {
            stop();
            return;
          }
          redraw();
          vfcRef.current = video.requestVideoFrameCallback(onFrame);
        };
        vfcRef.current = video.requestVideoFrameCallback(onFrame);
      } else {
        const tick = () => {
          if (video.paused) return;
          if (video.currentTime >= end) {
            stop();
            return;
          }
          redraw();
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    } else {
      video.pause();
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (hasVfc && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(vfcRef.current);
      }
    };
  }, [playing, edit.startSec, edit.endSec, edit.muted, edit.volume, redraw, onTogglePlay]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (stickerMode && onPlaceSticker) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      onPlaceSticker(x, y);
      return;
    }
    onTogglePlay?.();
  }

  const cur = videoRef.current?.currentTime ?? edit.startSec;
  const clipLen = Math.max(0, edit.endSec - edit.startSec);

  return (
    <div className={cn("relative flex items-center justify-center w-full h-full bg-neutral-900", className)}>
      {/* display:none 이면 재생 중 프레임 디코딩이 멈춰 검은 화면이 됨.
          렌더 트리에는 남기되(1px·투명) 화면에는 안 보이게 처리 */}
      <video
        ref={videoRef}
        src={src ?? undefined}
        className="absolute h-px w-px opacity-0 pointer-events-none -z-10"
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onError={onError}
        aria-hidden
      />
      <canvas
        ref={canvasRef}
        data-functional-canvas
        className={cn(
          "max-w-full max-h-full object-contain",
          stickerMode && "cursor-crosshair"
        )}
        onClick={handleCanvasClick}
      />

      {/* 재생 컨트롤 오버레이 */}
      <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-white text-xs backdrop-blur-sm">
          <button
            type="button"
            className="pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay?.();
            }}
            aria-label={playing ? "일시정지" : "재생"}
          >
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </button>
          <span className="tabular-nums">
            {formatVideoTime(Math.max(0, cur - edit.startSec))} / {formatVideoTime(clipLen)}
          </span>
        </div>
      </div>
    </div>
  );
}
