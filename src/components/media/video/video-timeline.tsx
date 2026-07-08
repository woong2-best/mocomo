"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type VideoTimelineProps = {
  duration: number;
  startSec: number;
  endSec: number;
  currentSec: number;
  thumbnails: string[];
  disabled?: boolean;
  onStartChange: (sec: number) => void;
  onEndChange: (sec: number) => void;
  onSeek: (sec: number) => void;
  onDragEnd?: () => void;
};

export function VideoTimeline({
  duration,
  startSec,
  endSec,
  currentSec,
  thumbnails,
  disabled,
  onStartChange,
  onEndChange,
  onSeek,
  onDragEnd,
}: VideoTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = useCallback(
    (sec: number) => (duration > 0 ? Math.max(0, Math.min(100, (sec / duration) * 100)) : 0),
    [duration]
  );

  function secFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  function bindHandle(
    kind: "start" | "end",
    onChange: (sec: number) => void
  ) {
    return (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const sec = secFromClientX(ev.clientX);
        if (kind === "start") {
          onChange(Math.max(0, Math.min(sec, endSec - 0.3)));
        } else {
          onChange(Math.max(startSec + 0.3, Math.min(sec, duration)));
        }
      };
      const onUp = () => {
        target.releasePointerCapture(e.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        onDragEnd?.();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  const startPct = pct(startSec);
  const endPct = pct(endSec);
  const curPct = pct(currentSec);

  return (
    <div className="px-3 pb-2 pt-1">
      <div
        ref={trackRef}
        className={cn(
          "relative h-14 rounded-lg overflow-hidden bg-muted/50 border border-border/60",
          !disabled && "cursor-pointer"
        )}
        onClick={(e) => {
          if (disabled) return;
          onSeek(secFromClientX(e.clientX));
        }}
      >
        {/* 필름스트립 썸네일 */}
        <div className="absolute inset-0 flex">
          {thumbnails.length > 0 ? (
            thumbnails.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-full flex-1 object-cover min-w-0"
                draggable={false}
              />
            ))
          ) : (
            <div className="w-full h-full bg-neutral-800 animate-pulse" />
          )}
        </div>

        {/* 선택 구간 밖 어둡게 */}
        <div
          className="absolute inset-y-0 left-0 bg-black/55 pointer-events-none"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 bg-black/55 pointer-events-none"
          style={{ width: `${100 - endPct}%` }}
        />

        {/* 선택 구간 테두리 */}
        <div
          className="absolute inset-y-0 border-y-2 border-primary pointer-events-none"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* 재생 헤드 */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white shadow pointer-events-none z-10"
          style={{ left: `${curPct}%` }}
        />

        {/* 시작 핸들 */}
        <div
          className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center z-20 touch-none"
          style={{ left: `${startPct}%` }}
          onPointerDown={bindHandle("start", onStartChange)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-10 w-1.5 rounded-full bg-white shadow-md ring-1 ring-black/20" />
        </div>

        {/* 끝 핸들 */}
        <div
          className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center z-20 touch-none"
          style={{ left: `${endPct}%` }}
          onPointerDown={bindHandle("end", onEndChange)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-10 w-1.5 rounded-full bg-white shadow-md ring-1 ring-black/20" />
        </div>
      </div>
    </div>
  );
}
