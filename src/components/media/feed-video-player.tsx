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
  const [scrubProgress, setScrubProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // h-full 이 있으면 부모가 크기를 정한다(피드 타일) → 비디오를 채운다.
  // 없으면 비디오 본래 비율로 흐른다(상세/에피소드 뷰어).
  const fillMode = /\bh-full\b/.test(className ?? "");

  const stop = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
  };

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
    // 사용자가 명시적으로 눌렀으니 소리와 함께 재생
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
    const onMeta = () => setDuration(v.duration);
    const onEnded = () => {
      setPlaying(false);
      setStarted(false);
    };
    const onVolume = () => setIsMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolume);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVolume);
    };
  }, []);

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
    scrubbingRef.current = false;
    setIsScrubbing(false);
    const v = videoRef.current;
    if (v) setCurrent(v.currentTime);
  }, []);

  const beginScrub = useCallback(() => {
    scrubbingRef.current = true;
    setIsScrubbing(true);
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration) && v.duration > 0) {
      setScrubProgress((v.currentTime / v.duration) * 100);
    }
  }, []);

  useEffect(() => {
    if (!isScrubbing) return;
    const onUp = () => endScrub();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isScrubbing, endScrub]);

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const pct = Number(e.target.value);
    setScrubProgress(pct);
    v.currentTime = (pct / 100) * duration;
    if (!scrubbingRef.current) setCurrent(v.currentTime);
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const displayProgress = isScrubbing ? scrubProgress : progress;
  const displayCurrent =
    isScrubbing && duration ? (scrubProgress / 100) * duration : current;

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
          stop(e);
          if (!started) startPlayback();
          else togglePlay();
        }}
      />

      {/* 중앙 재생 버튼: 아직 재생 전이거나 일시정지 상태에서 노출 */}
      {!playing && (
        <button
          type="button"
          aria-label="재생"
          onClick={(e) => {
            stop(e);
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

      {/* 하단 컨트롤 바: 재생 시작 후 노출 */}
      {started && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-[3] px-3 pb-2 pt-6",
            "bg-gradient-to-t from-black/70 via-black/25 to-transparent",
            "opacity-0 group-hover/video:opacity-100 focus-within:opacity-100 transition-opacity",
            !playing && "opacity-100"
          )}
          onClick={stop}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={0.05}
            value={displayProgress}
            onChange={seek}
            onInput={seek}
            onPointerDown={(e) => {
              stop(e);
              beginScrub();
            }}
            onPointerUp={(e) => {
              stop(e);
              endScrub();
            }}
            onPointerCancel={endScrub}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") beginScrub();
            }}
            onKeyUp={endScrub}
            onClick={stop}
            aria-label="탐색"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-white [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            style={{
              background: `linear-gradient(to right, #ffffff ${displayProgress}%, rgba(255,255,255,0.3) ${displayProgress}%)`,
            }}
          />

          <div className="mt-1.5 flex items-center gap-3 text-white">
            <button type="button" aria-label={playing ? "일시정지" : "재생"} onClick={(e) => { stop(e); togglePlay(); }}>
              {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
            </button>

            <button type="button" aria-label={isMuted ? "음소거 해제" : "음소거"} onClick={(e) => { stop(e); toggleMute(); }}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>

            <span className="text-[11px] tabular-nums text-white/90">
              {formatTime(displayCurrent)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {/* 재생 속도 */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="재생 속도"
                  onClick={(e) => { stop(e); setSpeedOpen((o) => !o); }}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-white/25"
                >
                  {speed}x
                </button>
                {speedOpen && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-lg bg-black/90 py-1 text-xs shadow-lg ring-1 ring-white/10"
                    onClick={stop}
                  >
                    <p className="px-3 py-1 text-[10px] text-white/50">재생 속도</p>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={(e) => { stop(e); applySpeed(rate); }}
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
                <button type="button" aria-label="전체화면" onClick={(e) => { stop(e); toggleFullscreen(); }}>
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
