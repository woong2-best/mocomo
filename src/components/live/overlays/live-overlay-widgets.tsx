"use client";

import type { LiveOverlayLotteryProps, LiveOverlayTextProps, LiveOverlayWheelProps } from "@/lib/live-overlays/types";

export function TextOverlayWidget({ props }: { props: LiveOverlayTextProps }) {
  return (
    <div
      className="flex h-full w-full items-center px-3 py-2"
      style={{
        background: props.background,
        justifyContent:
          props.align === "left" ? "flex-start" : props.align === "right" ? "flex-end" : "center",
      }}
    >
      <p
        className="leading-tight break-words w-full"
        style={{
          color: props.color,
          fontSize: props.fontSize,
          fontWeight: props.bold ? 700 : 500,
          textAlign: props.align,
        }}
      >
        {props.content}
      </p>
    </div>
  );
}

export function WheelOverlayWidget({ props }: { props: LiveOverlayWheelProps }) {
  const segments = props.segments.filter((s) => s.label.trim());
  const count = Math.max(segments.length, 1);
  const colors = ["#e85d04", "#f48c06", "#ffba08", "#52b788", "#4cc9f0", "#7209b7", "#f72585"];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black/40 p-2 text-white">
      {props.title && <p className="mb-1 text-[11px] font-bold truncate w-full text-center">{props.title}</p>}
      <div className="relative flex-1 aspect-square max-h-[85%] w-full flex items-center justify-center">
        <div
          className="relative h-full w-full max-w-full rounded-full border-2 border-white/30 shadow-lg transition-transform duration-[4000ms] ease-out"
          style={{
            transform: `rotate(${props.rotation}deg)`,
            transitionDuration: props.spinning ? "4000ms" : "0ms",
          }}
        >
          {segments.map((seg, i) => {
            const angle = (360 / count) * i;
            return (
              <div
                key={seg.id}
                className="absolute inset-0 origin-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className="absolute left-1/2 top-0 h-1/2 w-1/2 origin-bottom-left"
                  style={{
                    background: colors[i % colors.length],
                    clipPath: "polygon(0 100%, 100% 0, 0 0)",
                    transform: `rotate(${360 / count / 2}deg)`,
                  }}
                />
                <span
                  className="absolute left-1/2 top-[18%] -translate-x-1/2 text-[9px] font-bold drop-shadow"
                  style={{ transform: `rotate(${360 / count / 2}deg)` }}
                >
                  {seg.label}
                </span>
              </div>
            );
          })}
          <div className="absolute inset-[38%] rounded-full bg-black/80 flex items-center justify-center text-[10px] font-bold text-center px-1">
            {props.spinning ? "…" : props.lastResult ?? "?"}
          </div>
        </div>
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-white" />
      </div>
    </div>
  );
}

export function LotteryOverlayWidget({ props }: { props: LiveOverlayLotteryProps }) {
  return (
    <div className="flex h-full w-full flex-col bg-black/55 text-white p-2 rounded-lg border border-white/20">
      <p className="text-xs font-bold mb-1 truncate">{props.title}</p>
      <div className="flex-1 flex items-center justify-center min-h-0">
        {props.drawing ? (
          <p className="text-lg font-bold animate-pulse">추첨 중…</p>
        ) : props.winner ? (
          <div className="text-center">
            <p className="text-[10px] text-white/70">당첨</p>
            <p className="text-xl font-black text-yellow-300 break-all">{props.winner}</p>
          </div>
        ) : (
          <p className="text-sm text-white/60 text-center">후보 {props.entries.filter((e) => e.trim()).length}명</p>
        )}
      </div>
      {props.history.length > 0 && (
        <p className="text-[9px] text-white/50 truncate mt-1">최근: {props.history.slice(0, 3).join(", ")}</p>
      )}
    </div>
  );
}
