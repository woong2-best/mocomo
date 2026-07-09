"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

type Props = {
  src: string;
  className?: string;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  controls?: boolean;
  protect?: boolean;
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readVideoDuration(video: HTMLVideoElement): number {
  const d = video.duration;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

export function FeedVideoPlayer({
  src,
  className,
  muted = true,
  playsInline = true,
  preload = "metadata",
  protect = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubbingRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  /** 드래그 중에만 사용 — null이면 재생 위치 기준 */
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fillMode = /\bh-full\b/.test(className ?? "");

  const stopBubble = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };

  const syncDuration = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const d = readVideoDuration(v);
    if (d > 0) setDuration(d);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  const startPlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    v.muted = false;
    setIsMuted(false);
    void v.play();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
    };
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (!scrubbingRef.current) setCurrent(v.currentTime);
    };
    const onMeta = () => syncDuration();
    const onEnded = () => {
      setPlaying(false);
      setScrubPct(null);
      scrubbingRef.current = false;
    };
    const onVolume = () => setIsMuted(v.muted);

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolume);
    syncDuration();

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVolume);
    };
  }, [syncDuration, src]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const applySpeed = (rate: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
    setSpeed(rate);
    setSpeedOpen(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setScrubPct(null);
    const v = videoRef.current;
    if (v) setCurrent(v.currentTime);
  }, []);

  const applyScrub = useCallback((pct: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = readVideoDuration(v) || duration;
    if (d <= 0) return;

    const clamped = Math.min(100, Math.max(0, pct));
    setScrubPct(clamped);
    v.currentTime = (clamped / 100) * d;
    if (!scrubbingRef.current) setCurrent(v.currentTime);
  }, [duration]);

  const onScrubPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    stopBubble(e);
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyScrub(
      Number(e.currentTarget.value) ||
        (duration > 0 ? (current / duration) * 100 : 0)
    );
  };

  const onScrubPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    stopBubble(e);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endScrub();
  };

  const liveDuration = (() => {
    const v = videoRef.current;
    if (v) {
      const d = readVideoDuration(v);
      if (d > 0) return d;
    }
    return duration;
  })();
  const progress = liveDuration > 0 ? (current / liveDuration) * 100 : 0;
  const displayProgress = scrubPct ?? progress;
  const displayCurrent =
    scrubPct !== null && liveDuration > 0
      ? (scrubPct / 100) * liveDuration
      : current;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-black group/video", className)}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(fillMode ? "absolute inset-0 h-full w-full object-cover" : "block w-full h-auto")}
        muted={isMuted}
        playsInline={playsInline}
        preload={preload}
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noremoteplayback noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          stopBubble(e);
          if (!started) startPlayback();
          else togglePlay();
        }}
      />

      {!playing && (
        <button
          type="button"
          aria-label="재생"
          onClick={(e) => {
            stopBubble(e);
            if (!started) startPlayback();
            else togglePlay();
          }}
          className="absolute inset-0 z-[2] flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform group-hover/video:scale-105">
            <Play className="h-7 w-7 translate-x-[2px]" fill="currentColor" />
          </span>
        </button>
      )}

      {started && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-[3] px-3 pb-2 pt-6",
            "bg-gradient-to-t from-black/70 via-black/25 to-transparent",
            "opacity-0 group-hover/video:opacity-100 focus-within:opacity-100 transition-opacity",
            !playing && "opacity-100"
          )}
          onClick={stopBubble}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={0.05}
            value={displayProgress}
            onChange={(e) => applyScrub(Number(e.target.value))}
            onInput={(e) => applyScrub(Number(e.currentTarget.value))}
            onPointerDown={onScrubPointerDown}
            onPointerUp={onScrubPointerUp}
            onPointerCancel={onScrubPointerUp}
            onLostPointerCapture={endScrub}
            aria-label="탐색"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            style={{
              background: `linear-gradient(to right, #ffffff ${displayProgress}%, rgba(255,255,255,0.3) ${displayProgress}%)`,
            }}
          />

          <div className="mt-1.5 flex items-center gap-3 text-white">
            <button
              type="button"
              aria-label={playing ? "일시정지" : "재생"}
              onClick={(e) => {
                stopBubble(e);
                togglePlay();
              }}
            >
              {playing ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              aria-label={isMuted ? "음소거 해제" : "음소거"}
              onClick={(e) => {
                stopBubble(e);
                toggleMute();
              }}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <span className="text-[11px] tabular-nums text-white/90">
              {formatTime(displayCurrent)} / {formatTime(liveDuration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="재생 속도"
                  onClick={(e) => {
                    stopBubble(e);
                    setSpeedOpen((o) => !o);
                  }}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/25"
                >
                  {speed}x
                </button>
                {speedOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-lg bg-black/90 py-1 text-xs shadow-lg ring-1 ring-white/10"
                    onClick={stopBubble}
                  >
                    <p className="px-3 py-1 text-[10px] text-white/50">재생 속도</p>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => {
                          stopBubble(e);
                          applySpeed(rate);
                        }}
                        className={cn(
                          "block w-full px-3 py-1.5 text-left hover:bg-white/10",
                          rate === speed ? "font-bold text-white" : "text-white/80"
                        )}
                      >
                        {rate === 1 ? "1x (기본)" : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!protect && (
                <button
                  type="button"
                  aria-label="전체화면"
                  onClick={(e) => {
                    stopBubble(e);
                    toggleFullscreen();
                  }}
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
