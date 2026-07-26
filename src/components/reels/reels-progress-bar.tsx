"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  progress: number;
  buffered?: number;
  onSeek: (ratio: number) => void;
  className?: string;
  label?: string;
};

export function ReelsProgressBar({
  progress,
  buffered = 0,
  onSeek,
  className,
  label = "Seek",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const ratioFromEvent = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const seekAt = useCallback(
    (clientX: number) => {
      onSeek(ratioFromEvent(clientX));
    },
    [onSeek, ratioFromEvent]
  );

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className={cn(
        "group relative h-5 w-full cursor-pointer touch-none select-none",
        className
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        e.stopPropagation();
        seekAt(e.clientX);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.stopPropagation();
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          const delta = e.key === "ArrowLeft" ? -0.05 : 0.05;
          onSeek(Math.min(1, Math.max(0, progress + delta)));
        }
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-1.5 group-focus-visible:h-1.5">
        <div
          className="absolute inset-y-0 left-0 bg-white/35"
          style={{ width: `${Math.min(100, buffered * 100)}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-white"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
