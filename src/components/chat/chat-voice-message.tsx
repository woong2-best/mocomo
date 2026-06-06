"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 32;

function formatVoiceTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** 인스타 DM 스타일 음성 메시지 말풍선 */
export function ChatVoiceMessage({ url, isMine }: { url: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const barHeights = useRef(
    Array.from({ length: BAR_COUNT }, (_, i) => 30 + ((i * 17) % 55))
  ).current;

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onMeta = () => {
      if (Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onTime = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      setProgress(el.currentTime / el.duration);
      setDuration(el.duration);
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    el.addEventListener("timeupdate", onTime);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
      el.removeEventListener("timeupdate", onTime);
    };
  }, [url]);

  const displaySec = playing
    ? progress * duration
    : duration > 0
      ? duration
      : 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 min-w-[220px] max-w-[min(280px,72vw)] rounded-2xl shadow-sm",
        isMine
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-background border border-border/60 rounded-bl-md"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-colors",
          isMine
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
            : "bg-muted hover:bg-muted/80"
        )}
        aria-label={playing ? "일시정지" : "재생"}
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-end gap-[2px] h-8 min-w-0">
        {barHeights.map((h, i) => {
          const filled = i / BAR_COUNT <= progress;
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-colors",
                isMine
                  ? filled
                    ? "bg-primary-foreground"
                    : "bg-primary-foreground/35"
                  : filled
                    ? "bg-foreground/80"
                    : "bg-foreground/25"
              )}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      <span
        className={cn(
          "text-[11px] tabular-nums shrink-0",
          isMine ? "text-primary-foreground/85" : "text-muted-foreground"
        )}
      >
        {formatVoiceTime(displaySec)}
      </span>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
    </div>
  );
}
