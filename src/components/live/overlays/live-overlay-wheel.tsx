"use client";

import { useId } from "react";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import { WHEEL_COLORS, WHEEL_SPIN_MS } from "@/lib/live-overlays/wheel-theme";
import type { LiveOverlayWheelProps } from "@/lib/live-overlays/types";

const SIZE = 200;
const CX = 100;
const CY = 100;
const R = 96;

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
  const clipId = useId().replace(/:/g, "");
  const ctx = useLiveOverlayContextOptional();
  const isHost = ctx?.isHost ?? false;
  const segments = props.segments.filter((s) => s.label.trim());
  const count = Math.max(segments.length, 1);
  const segAngle = 360 / count;

  const hubLabel = props.spinning ? "…" : props.lastResult ?? "GO";

  function spin(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isHost || !ctx || props.spinning) return;
    ctx.spinWheel(widgetId);
  }

  return (
    <div
      className="live-overlay-wheel relative h-full w-full rounded-full bg-transparent pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* 고정 포인터 (12시 방향) */}
      <div
        className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[15%] pointer-events-none drop-shadow-md"
        aria-hidden
      >
        <svg width="22" height="18" viewBox="0 0 22 18" className="text-folk-terracotta">
          <path d="M11 18 L2 2 L20 2 Z" fill="currentColor" stroke="#fff" strokeWidth="1.2" />
        </svg>
      </div>

      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `rotate(${props.rotation}deg)`,
          transition: props.spinning
            ? `transform ${WHEEL_SPIN_MS}ms cubic-bezier(0.12, 0.85, 0.15, 1)`
            : "none",
        }}
      >
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          <defs>
            <clipPath id={clipId}>
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {segments.map((seg, i) => {
              const mid = i * segAngle + segAngle / 2;
              const tp = polar(R * 0.62, mid);
              const fontSize = count <= 6 ? 15 : count <= 8 ? 11 : 9;
              return (
                <g key={seg.id}>
                  <path
                    d={wedgePath(i, count)}
                    fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="0.6"
                  />
                  <text
                    x={tp.x}
                    y={tp.y}
                    fill="#fff"
                    fontSize={fontSize}
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}
          </g>
          <circle cx={CX} cy={CY} r={18} fill="rgba(0,0,0,0.7)" />
          <text
            x={CX}
            y={CY}
            fill="#fff"
            fontSize={hubLabel.length > 4 ? 8 : 10}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {hubLabel.length > 10 ? `${hubLabel.slice(0, 9)}…` : hubLabel}
          </text>
        </svg>
      </div>

      {isHost && (
        <button
          type="button"
          disabled={props.spinning}
          onClick={spin}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 z-10 cursor-pointer rounded-full disabled:cursor-wait focus:outline-none"
          aria-label="돌림판 돌리기"
        />
      )}
    </div>
  );
}
