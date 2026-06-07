"use client";

import { RotateCw } from "lucide-react";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import { WHEEL_PASTEL_COLORS } from "@/lib/live-overlays/wheel-theme";
import type { LiveOverlayWheelProps } from "@/lib/live-overlays/types";

const SIZE = 200;
const CX = 100;
const CY = 100;
const R = 88;

function polar(r: number, degFromTopClockwise: number) {
  const rad = ((degFromTopClockwise - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function wedgePath(index: number, count: number) {
  const seg = 360 / count;
  const start = index * seg;
  const end = (index + 1) * seg;
  const p1 = polar(R, start);
  const p2 = polar(R, end);
  const large = seg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

export function LiveOverlayWheel({
  widgetId,
  props,
}: {
  widgetId: string;
  props: LiveOverlayWheelProps;
}) {
  const ctx = useLiveOverlayContextOptional();
  const isHost = ctx?.isHost ?? false;
  const segments = props.segments.filter((s) => s.label.trim());
  const count = Math.max(segments.length, 1);
  const segAngle = 360 / count;

  const displayResult = props.spinning ? "…" : props.lastResult ?? "";

  return (
    <div className="live-overlay-wheel flex h-full w-full flex-col items-center justify-center bg-[#faf7f2] px-2 py-2 text-[#4a4a4a] @container">
      <p
        className="mb-1 w-full truncate text-center text-[clamp(11px,3.2cqw,16px)] font-semibold leading-tight min-h-[1.25em]"
        aria-live="polite"
      >
        {displayResult}
      </p>

      <div className="relative aspect-square w-full max-h-[58%] min-h-0 flex-shrink">
        {/* 고정 포인터 (12시) */}
        <svg
          viewBox="0 0 200 24"
          className="absolute left-1/2 top-0 z-20 w-[14%] min-w-[14px] -translate-x-1/2 -translate-y-[35%]"
          aria-hidden
        >
          <path
            d="M 100 2 L 112 20 L 100 15 L 88 20 Z"
            fill="#c0392b"
            stroke="#96281b"
            strokeWidth="0.8"
          />
        </svg>

        <div
          className="h-full w-full transition-transform ease-out"
          style={{
            transform: `rotate(${props.rotation}deg)`,
            transitionDuration: props.spinning ? "4200ms" : "0ms",
          }}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full drop-shadow-sm">
            {segments.map((seg, i) => {
              const mid = i * segAngle + segAngle / 2;
              const tp = polar(R * 0.62, mid);
              const fontSize = count <= 6 ? 11 : count <= 8 ? 9 : 7;
              return (
                <g key={seg.id}>
                  <path
                    d={wedgePath(i, count)}
                    fill={WHEEL_PASTEL_COLORS[i % WHEEL_PASTEL_COLORS.length]}
                    stroke="#5c5c5c"
                    strokeWidth="0.6"
                  />
                  <text
                    x={tp.x}
                    y={tp.y}
                    fill="#3d3d3d"
                    fontSize={fontSize}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
                    style={{ pointerEvents: "none" }}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={7} fill="#333333" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#5c5c5c" strokeWidth="2.2" />
          </svg>
        </div>
      </div>

      {isHost && ctx && (
        <div
          className="mt-auto flex w-full gap-1.5 pt-2 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={props.spinning}
            onClick={() => ctx.spinWheel(widgetId)}
            className="flex-1 rounded-full bg-[#6b5b4f] px-2 py-1.5 text-[clamp(9px,2.4cqw,12px)] font-medium text-white shadow-sm transition hover:bg-[#5a4d43] disabled:opacity-50"
          >
            다시돌리기
          </button>
          <button
            type="button"
            disabled={props.spinning}
            onClick={() => ctx.resetWheel(widgetId)}
            className="flex flex-1 items-center justify-center gap-0.5 rounded-full bg-[#6b5b4f] px-2 py-1.5 text-[clamp(9px,2.4cqw,12px)] font-medium text-white shadow-sm transition hover:bg-[#5a4d43] disabled:opacity-50"
          >
            <RotateCw className="h-3 w-3 shrink-0" />
            새 원판
          </button>
        </div>
      )}
    </div>
  );
}
