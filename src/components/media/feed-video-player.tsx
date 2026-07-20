"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_VOLUME = 1;

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
  if (Number.isFinite(d) && d > 0) return d;

  try {
    if (video.seekable.length > 0) {
      const end = video.seekable.end(video.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    /* seekable not ready */
  }

  return 0;
}

function stopFeedNavigation(e: React.SyntheticEvent) {
  e.stopPropagation();
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
  const trackRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const volumeDraggingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const pendingSeekPctRef = useRef<number | null>(null);
  const volumeBeforeMuteRef = useRef(DEFAULT_VOLUME);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fillMode = /\bh-full\b/.test(className ?? "");

  const syncDuration = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const d = readVideoDuration(v);
    if (d <= 0) return;
    setDuration(d);
    if (pendingSeekPctRef.current !== null) {
      const pct = pendingSeekPctRef.current;
      pendingSeekPctRef.current = null;
      const time = (pct / 100) * d;
      v.currentTime = time;
      setCurrent(time);
      setScrubPct(pct);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const applyVolume = useCallback((next: number) => {
    const v = videoRef.current;
    const clamped = Math.min(1, Math.max(0, next));
    setVolume(clamped);
    if (clamped > 0) volumeBeforeMuteRef.current = clamped;
    if (!v) return;
    v.volume = clamped;
    if (clamped <= 0) {
      v.muted = true;
      setIsMuted(true);
    } else {
      v.muted = false;
      setIsMuted(false);
    }
  }, []);

  const startPlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setStarted(true);
    v.volume = volume > 0 ? volume : volumeBeforeMuteRef.current;
    if (v.volume <= 0) v.volume = DEFAULT_VOLUME;
    setVolume(v.volume);
    volumeBeforeMuteRef.current = v.volume;
    v.muted = false;
    setIsMuted(false);
    void v.play();
  }, [volume]);

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
    const onVolume = () => {
      setIsMuted(v.muted);
      if (!volumeDraggingRef.current) setVolume(v.volume);
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("loadeddata", onMeta);
    v.addEventListener("canplay", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("progress", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolume);
    syncDuration();

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("loadeddata", onMeta);
      v.removeEventListener("canplay", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("progress", onMeta);
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
    if (v.muted || v.volume <= 0) {
      const restore = volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : DEFAULT_VOLUME;
      v.volume = restore;
      v.muted = false;
      setVolume(restore);
      setIsMuted(false);
    } else {
      volumeBeforeMuteRef.current = v.volume > 0 ? v.volume : volumeBeforeMuteRef.current;
      v.muted = true;
      setIsMuted(true);
    }
  };

  const volumePctFromPointer = useCallback((clientY: number) => {
    const track = volumeTrackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return 0;
    // top = 100%, bottom = 0%
    return Math.min(100, Math.max(0, ((rect.bottom - clientY) / rect.height) * 100));
  }, []);

  const endVolumeDrag = useCallback(() => {
    if (!volumeDraggingRef.current) return;
    volumeDraggingRef.current = false;
    setIsVolumeDragging(false);
  }, []);

  useEffect(() => {
    if (!isVolumeDragging) return;

    const onMove = (e: PointerEvent) => {
      if (!volumeDraggingRef.current) return;
      applyVolume(volumePctFromPointer(e.clientY) / 100);
    };
    const onUp = () => endVolumeDrag();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isVolumeDragging, applyVolume, volumePctFromPointer, endVolumeDrag]);

  const onVolumeTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    e.preventDefault();
    volumeDraggingRef.current = true;
    setIsVolumeDragging(true);
    setVolumeOpen(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    applyVolume(volumePctFromPointer(e.clientY) / 100);
  };

  const onVolumeTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeDraggingRef.current) return;
    stopFeedNavigation(e);
    applyVolume(volumePctFromPointer(e.clientY) / 100);
  };

  const onVolumeTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    endVolumeDrag();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const seekToPercent = useCallback(
    (pct: number) => {
      const v = videoRef.current;
      if (!v) return false;

      const clamped = Math.min(100, Math.max(0, pct));
      setScrubPct(clamped);

      const d = readVideoDuration(v) || duration;
      if (d <= 0) {
        pendingSeekPctRef.current = clamped;
        return false;
      }

      pendingSeekPctRef.current = null;
      const time = (clamped / 100) * d;
      try {
        if (typeof v.fastSeek === "function") v.fastSeek(time);
        else v.currentTime = time;
      } catch {
        v.currentTime = time;
      }
      setCurrent(time);
      if (d !== duration) setDuration(d);
      return true;
    },
    [duration]
  );

  const pctFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const endScrub = useCallback(() => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setIsScrubbing(false);
    setScrubPct(null);
    pendingSeekPctRef.current = null;
    const v = videoRef.current;
    if (v) {
      setCurrent(v.currentTime);
      if (resumeAfterScrubRef.current) void v.play();
    }
    resumeAfterScrubRef.current = false;
  }, []);

  useEffect(() => {
    if (!isScrubbing) return;

    const onMove = (e: PointerEvent) => {
      if (!scrubbingRef.current) return;
      seekToPercent(pctFromPointer(e.clientX));
    };
    const onUp = () => endScrub();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isScrubbing, seekToPercent, pctFromPointer, endScrub]);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
    const v = videoRef.current;
    if (v) {
      resumeAfterScrubRef.current = !v.paused;
      if (resumeAfterScrubRef.current) v.pause();
    }
    scrubbingRef.current = true;
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToPercent(pctFromPointer(e.clientX));
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    stopFeedNavigation(e);
    seekToPercent(pctFromPointer(e.clientX));
  };

  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopFeedNavigation(e);
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
  const effectiveMuted = isMuted || volume <= 0;
  const displayVolumePct = effectiveMuted ? 0 : Math.round(volume * 100);
  const VolumeIcon = effectiveMuted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showVolumePanel = volumeOpen || isVolumeDragging;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-black group/video", className)}
      onClick={stopFeedNavigation}
      onPointerDown={stopFeedNavigation}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          fillMode ? "absolute inset-0 h-full w-full object-cover" : "block w-full h-auto"
        )}
        muted={isMuted}
        playsInline={playsInline}
        preload={preload}
        controls={false}
        disablePictureInPicture
        controlsList="nodownload noremoteplayback noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          stopFeedNavigation(e);
          if (!started) startPlayback();
          else togglePlay();
        }}
      />

      {!playing && (
        <button
          type="button"
          aria-label="재생"
          onClick={(e) => {
            stopFeedNavigation(e);
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
          data-video-controls
          className={cn(
            "absolute inset-x-0 bottom-0 z-[3] px-3 pb-2 pt-8",
            "bg-gradient-to-t from-black/80 via-black/35 to-transparent",
            "opacity-100"
          )}
          onClick={stopFeedNavigation}
          onPointerDown={stopFeedNavigation}
        >
          <div
            ref={trackRef}
            role="slider"
            aria-label="탐색"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(displayProgress)}
            tabIndex={0}
            className="relative flex h-6 cursor-pointer touch-none items-center"
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                seekToPercent(displayProgress - 2);
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                seekToPercent(displayProgress + 2);
              }
            }}
          >
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30" />
            <div
              className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white"
              style={{ width: `${displayProgress}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `${displayProgress}%` }}
            />
          </div>

          <div className="mt-0.5 flex items-center gap-3 text-white">
            <button
              type="button"
              aria-label={playing ? "일시정지" : "재생"}
              onClick={(e) => {
                stopFeedNavigation(e);
                togglePlay();
              }}
            >
              {playing ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </button>

            <div
              className="relative"
              onMouseEnter={() => setVolumeOpen(true)}
              onMouseLeave={() => {
                if (!volumeDraggingRef.current) setVolumeOpen(false);
              }}
              onFocus={() => setVolumeOpen(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !volumeDraggingRef.current) {
                  setVolumeOpen(false);
                }
              }}
            >
              {showVolumePanel && (
                <div
                  className="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 flex-col items-center rounded-full bg-black/85 px-2 pb-1.5 pt-3 shadow-lg ring-1 ring-white/10 backdrop-blur-sm"
                  onClick={stopFeedNavigation}
                  onPointerDown={stopFeedNavigation}
                >
                  <div
                    ref={volumeTrackRef}
                    role="slider"
                    aria-label="볼륨"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={displayVolumePct}
                    aria-orientation="vertical"
                    tabIndex={0}
                    className="relative flex h-20 w-6 cursor-pointer touch-none items-center justify-center"
                    onPointerDown={onVolumeTrackPointerDown}
                    onPointerMove={onVolumeTrackPointerMove}
                    onPointerUp={onVolumeTrackPointerUp}
                    onPointerCancel={onVolumeTrackPointerUp}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        applyVolume(Math.min(1, volume + 0.05));
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        applyVolume(Math.max(0, volume - 0.05));
                      }
                    }}
                  >
                    <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/30" />
                    <div
                      className="absolute bottom-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white"
                      style={{ height: `${displayVolumePct}%` }}
                    />
                    <div
                      className="absolute left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow"
                      style={{ bottom: `${displayVolumePct}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                aria-label={effectiveMuted ? "음소거 해제" : "음소거"}
                onClick={(e) => {
                  stopFeedNavigation(e);
                  toggleMute();
                }}
              >
                <VolumeIcon className="h-5 w-5" />
              </button>
            </div>

            <span className="text-[11px] tabular-nums text-white/90">
              {formatTime(displayCurrent)} / {formatTime(liveDuration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  aria-label="재생 속도"
                  onClick={(e) => {
                    stopFeedNavigation(e);
                    setSpeedOpen((o) => !o);
                  }}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/25"
                >
                  {speed}x
                </button>
                {speedOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-lg bg-black/90 py-1 text-xs shadow-lg ring-1 ring-white/10"
                    onClick={stopFeedNavigation}
                  >
                    <p className="px-3 py-1 text-[10px] text-white/50">재생 속도</p>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => {
                          stopFeedNavigation(e);
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
                    stopFeedNavigation(e);
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
