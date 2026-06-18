"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  PLAN_H,
  PLAN_W,
  WALL,
  FLOOR_STYLE_META,
  type AptRoom,
} from "@/lib/apt/floor-plan-types";
import { cn } from "@/lib/utils";

type Props = {
  rooms: AptRoom[];
  selectedIds: string[];
  onSelect: (id: string, multi: boolean) => void;
  onClearSelect: () => void;
};

const MIN_ZOOM = 0.45;
const MAX_ZOOM = 3.2;

function WoodPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" fill="#e8c9a0" />
      <line x1="0" y1="6" x2="12" y2="6" stroke="#d4ad82" strokeWidth="0.6" opacity="0.5" />
      <line x1="0" y1="2" x2="12" y2="2" stroke="#c9956a" strokeWidth="0.3" opacity="0.25" />
      <line x1="0" y1="10" x2="12" y2="10" stroke="#c9956a" strokeWidth="0.3" opacity="0.25" />
    </pattern>
  );
}

function CheckTilePattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#f7f7f5" />
      <rect x="8" y="8" width="8" height="8" fill="#f7f7f5" />
      <rect x="8" y="0" width="8" height="8" fill="#e8e8e4" />
      <rect x="0" y="8" width="8" height="8" fill="#e8e8e4" />
    </pattern>
  );
}

function LightTilePattern({ id }: { id: string }) {
  return (
    <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="#ebe8e3" />
      <rect x="0" y="0" width="9.5" height="9.5" fill="none" stroke="#d8d4cc" strokeWidth="0.4" />
    </pattern>
  );
}

function RoomDecor({ room }: { room: AptRoom }) {
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;

  if (room.type === "kitchen") {
    return (
      <g opacity={0.55}>
        <rect x={room.x + 24} y={room.y + 18} width={room.w - 48} height={28} rx={4} fill="#8b6f4e" />
        <circle cx={room.x + 52} cy={room.y + 32} r={8} fill="#4a4a4a" />
        <circle cx={room.x + 78} cy={room.y + 32} r={8} fill="#4a4a4a" />
        <rect x={room.x + room.w - 90} y={room.y + 22} width={36} height={20} rx={3} fill="#6b8fae" />
      </g>
    );
  }

  if (room.type === "bathroom") {
    return (
      <g opacity={0.5}>
        <rect x={cx - 22} y={cy - 10} width={44} height={28} rx={6} fill="#fff" stroke="#8eb8d4" strokeWidth={1.5} />
        <ellipse cx={cx} cy={cy + 22} rx={18} ry={10} fill="#fff" stroke="#8eb8d4" strokeWidth={1.5} />
        <rect x={cx - 8} y={room.y + 12} width={16} height={10} rx={2} fill="#fff" stroke="#8eb8d4" strokeWidth={1} />
      </g>
    );
  }

  if (room.type === "entrance") {
    return (
      <path
        d={`M ${room.x + 18} ${room.y + room.h - 8} A 22 22 0 0 1 ${room.x + 40} ${room.y + room.h - 30}`}
        fill="none"
        stroke="#2a4a7a"
        strokeWidth={2}
        opacity={0.35}
      />
    );
  }

  return null;
}

function floorFill(floor: AptRoom["floor"], uid: string) {
  switch (floor) {
    case "wood":
      return `url(#wood-${uid})`;
    case "tile-check":
      return `url(#check-${uid})`;
    case "tile-light":
    case "balcony":
      return `url(#tile-${uid})`;
    case "bathroom":
      return FLOOR_STYLE_META.bathroom.fill;
    default:
      return FLOOR_STYLE_META.beige.fill;
  }
}

export function AptFloorPlanCanvas({ rooms, selectedIds, onSelect, onClearSelect }: Props) {
  const uid = useRef(`fp-${Math.random().toString(36).slice(2, 8)}`).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPan({ x: Math.max(16, rect.width * 0.06), y: Math.max(12, rect.height * 0.05) });
  }, []);

  const adjustZoom = useCallback((factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
      const ratio = next / z;
      setPan((p) => ({
        x: mx - (mx - p.x) * ratio,
        y: my - (my - p.y) * ratio,
      }));
      return next;
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta));
      const ratio = next / z;
      setPan((p) => ({
        x: mx - (mx - p.x) * ratio,
        y: my - (my - p.y) * ratio,
      }));
      return next;
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const tag = (e.target as Element).tagName;
    if (tag === "g" || tag === "rect" || tag === "text" || tag === "path") return;
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--folk-gold)/0.18),transparent_55%),linear-gradient(160deg,hsl(var(--folk-cream)/0.9),#e8e4dc)]"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
      >
        <svg
          viewBox={`0 0 ${PLAN_W + 40} ${PLAN_H + 40}`}
          className="h-[min(68dvh,520px)] w-auto max-w-none drop-shadow-2xl"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClearSelect();
          }}
        >
          <defs>
            <WoodPattern id={`wood-${uid}`} />
            <CheckTilePattern id={`check-${uid}`} />
            <LightTilePattern id={`tile-${uid}`} />
            <filter id={`shadow-${uid}`} x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
            </filter>
            <linearGradient id={`frame-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a6e" />
              <stop offset="100%" stopColor="#2a4a7a" />
            </linearGradient>
          </defs>

          <rect x={8} y={8} width={PLAN_W + 16} height={PLAN_H + 16} rx={10} fill={`url(#frame-${uid})`} opacity={0.08} />

          <g transform="translate(20, 20)" filter={`url(#shadow-${uid})`}>
            <rect x={0} y={0} width={PLAN_W} height={PLAN_H} fill="#faf8f4" stroke="#1a2e4a" strokeWidth={WALL + 2} rx={2} />

            {rooms.map((room) => {
              const selected = selectedIds.includes(room.id);
              return (
                <g
                  key={room.id}
                  className={cn("transition-opacity duration-200", !room.locked && "cursor-pointer")}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!room.locked) onSelect(room.id, e.shiftKey);
                  }}
                >
                  <rect
                    x={room.x + WALL / 2}
                    y={room.y + WALL / 2}
                    width={room.w - WALL}
                    height={room.h - WALL}
                    fill={floorFill(room.floor, uid)}
                    stroke={selected ? "#c45a32" : "#1a2e4a"}
                    strokeWidth={selected ? 3.5 : WALL}
                    rx={1}
                  />
                  <RoomDecor room={room} />
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + room.h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="select-none pointer-events-none"
                    fill="#1e3a6e"
                    fontSize={Math.min(22, room.w / 7, room.h / 3)}
                    fontWeight={700}
                    opacity={0.82}
                  >
                    {room.label}
                  </text>
                  {room.locked && (
                    <text
                      x={room.x + 10}
                      y={room.y + 18}
                      fill="#1e3a6e"
                      fontSize={10}
                      opacity={0.45}
                      fontWeight={600}
                    >
                      고정
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
        휠 확대/축소 · 드래그 이동
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5">
        <div className="rounded-lg border border-[hsl(var(--folk-cobalt)/0.15)] bg-background/90 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-folk-cobalt backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => adjustZoom(1.15)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/95 text-folk-cobalt shadow-sm hover:bg-[hsl(var(--folk-gold)/0.15)]"
          aria-label="확대"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => adjustZoom(0.87)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--folk-cobalt)/0.2)] bg-background/95 text-folk-cobalt shadow-sm hover:bg-[hsl(var(--folk-gold)/0.15)]"
          aria-label="축소"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
