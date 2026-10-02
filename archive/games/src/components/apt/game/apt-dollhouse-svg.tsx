"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Zone = {
  roomIdKey: string;
  label: string;
  wall: string;
  floor: string;
  wallColor: string;
  floorA: string;
  floorB: string;
  hit: { x: number; y: number; w: number; h: number };
  labelPos: { x: number; y: number };
  decor: React.ReactNode;
};

function MiniSofa({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-18} y={-8} width={36} height={14} rx={4} fill="#e85d5d" stroke="#4a3428" strokeWidth={1.2} />
      <rect x={-16} y={-16} width={10} height={10} rx={2} fill="#d94a4a" stroke="#4a3428" strokeWidth={1} />
      <rect x={6} y={-16} width={10} height={10} rx={2} fill="#d94a4a" stroke="#4a3428" strokeWidth={1} />
    </g>
  );
}

function MiniBed({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-22} y={-6} width={44} height={16} rx={3} fill="#f0a8a8" stroke="#4a3428" strokeWidth={1.2} />
      <rect x={-20} y={-14} width={18} height={10} rx={2} fill="#fff" stroke="#4a3428" strokeWidth={1} />
    </g>
  );
}

function MiniDesk({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-16} y={-4} width={32} height={8} rx={2} fill="#e9c56d" stroke="#4a3428" strokeWidth={1.2} />
      <rect x={-4} y={-12} width={10} height={8} rx={1} fill="#3a4558" stroke="#4a3428" strokeWidth={1} />
    </g>
  );
}

function MiniTub({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={14} ry={8} fill="#e0f2f4" stroke="#4a3428" strokeWidth={1.2} />
      <ellipse cx={0} cy={-2} rx={10} ry={5} fill="#b8e0e8" stroke="#4a3428" strokeWidth={0.8} />
    </g>
  );
}

function MiniPlant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-4} y={2} width={8} height={6} rx={1} fill="#c4885a" stroke="#4a3428" strokeWidth={0.8} />
      <ellipse cx={0} cy={-2} rx={8} ry={6} fill="#6ecf78" stroke="#4a3428" strokeWidth={0.8} />
    </g>
  );
}

const ZONE_DEFS: Zone[] = [
  {
    roomIdKey: "bedroom-1",
    label: "침실 1",
    wall: "M 24 88 L 148 88 L 148 168 L 24 168 Z",
    floor: "M 24 168 L 148 168 L 148 248 L 24 248 Z",
    wallColor: "#e8eef8",
    floorA: "#c9d4e8",
    floorB: "#b8c6de",
    hit: { x: 24, y: 88, w: 124, h: 160 },
    labelPos: { x: 36, y: 182 },
    decor: (
      <>
        <MiniBed x={86} y={210} />
        <MiniPlant x={48} y={220} />
      </>
    ),
  },
  {
    roomIdKey: "bedroom-2",
    label: "침실 2",
    wall: "M 156 88 L 280 88 L 280 168 L 156 168 Z",
    floor: "M 156 168 L 280 168 L 280 248 L 156 248 Z",
    wallColor: "#eef0f8",
    floorA: "#ccd6ea",
    floorB: "#bbc9e0",
    hit: { x: 156, y: 88, w: 124, h: 160 },
    labelPos: { x: 168, y: 182 },
    decor: (
      <>
        <MiniBed x={218} y={210} />
        <MiniPlant x={180} y={220} />
      </>
    ),
  },
  {
    roomIdKey: "bathroom",
    label: "욕실",
    wall: "M 288 88 L 376 88 L 376 168 L 288 168 Z",
    floor: "M 288 168 L 376 168 L 376 248 L 288 248 Z",
    wallColor: "#e0f2f4",
    floorA: "#b8e0e8",
    floorB: "#a8d4de",
    hit: { x: 288, y: 88, w: 88, h: 160 },
    labelPos: { x: 300, y: 182 },
    decor: <MiniTub x={332} y={210} />,
  },
  {
    roomIdKey: "kitchen",
    label: "부엌",
    wall: "M 24 248 L 376 248 L 376 256 L 24 256 Z",
    floor: "M 24 256 L 376 256 L 376 340 L 24 340 Z",
    wallColor: "#e8f5e0",
    floorA: "#d4e8c4",
    floorB: "#c5ddb0",
    hit: { x: 24, y: 248, w: 352, h: 92 },
    labelPos: { x: 36, y: 272 },
    decor: (
      <>
        <MiniDesk x={120} y={300} />
        <MiniDesk x={280} y={300} />
        <MiniPlant x={200} y={310} />
      </>
    ),
  },
  {
    roomIdKey: "living",
    label: "거실",
    wall: "M 24 340 L 376 340 L 376 348 L 24 348 Z",
    floor: "M 24 348 L 376 348 L 376 492 L 24 492 Z",
    wallColor: "#faf3ea",
    floorA: "#e8c4a0",
    floorB: "#ddb892",
    hit: { x: 24, y: 340, w: 352, h: 152 },
    labelPos: { x: 36, y: 368 },
    decor: (
      <>
        <MiniSofa x={140} y={420} />
        <MiniSofa x={260} y={430} />
        <MiniPlant x={80} y={440} />
        <MiniPlant x={320} y={450} />
        <ellipse cx={200} cy={460} rx={55} ry={18} fill="#eb9f9f" stroke="#4a3428" strokeWidth={1} opacity={0.85} />
      </>
    ),
  },
];

function AptDollhouseSvgInner({
  rooms,
  onRoomClick,
  className,
}: {
  rooms: { id: string; label: string; type: string }[];
  onRoomClick: (roomId: string) => void;
  className?: string;
}) {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const activeZones = ZONE_DEFS.filter((z) => roomById.has(z.roomIdKey)).map((z) => ({
    ...z,
    label: roomById.get(z.roomIdKey)?.label ?? z.label,
    roomId: z.roomIdKey,
  }));

  return (
    <svg viewBox="0 0 400 520" className={cn("h-full w-full", className)} role="img" aria-label="우리 집">
      <defs>
        <filter id="dollhouse-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#4a3428" floodOpacity="0.18" />
        </filter>
        <linearGradient id="dollhouse-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf3" />
          <stop offset="100%" stopColor="#f0e6d8" />
        </linearGradient>
      </defs>

      <rect x={8} y={8} width={384} height={504} rx={24} fill="url(#dollhouse-bg)" stroke="#c9b08a" strokeWidth={3} filter="url(#dollhouse-shadow)" />

      {activeZones.map((zone) => (
        <g key={zone.roomId}>
          <defs>
            <pattern id={`dh-${zone.roomId}`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill={zone.floorA} />
              <rect x="6" width="6" height="6" fill={zone.floorB} />
              <rect y="6" width="6" height="6" fill={zone.floorB} />
              <rect x="6" y="6" width="6" height="6" fill={zone.floorA} />
            </pattern>
          </defs>
          <path d={zone.wall} fill={zone.wallColor} stroke="#4a3428" strokeWidth={1.5} />
          <path d={zone.floor} fill={`url(#dh-${zone.roomId})`} stroke="#4a3428" strokeWidth={1.5} />
          <g opacity={0.95}>{zone.decor}</g>
          <g
            className="cursor-pointer transition-opacity hover:opacity-90 active:opacity-80"
            onClick={() => onRoomClick(zone.roomId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onRoomClick(zone.roomId)}
          >
            <rect {...zone.hit} fill="transparent" />
            <rect x={zone.labelPos.x} y={zone.labelPos.y} width={zone.label.length * 10 + 14} height={18} rx={7} fill="rgba(255,255,255,0.94)" stroke="#4a3428" strokeWidth={1} />
            <text x={zone.labelPos.x + 7} y={zone.labelPos.y + 13} fontSize={10} fontWeight={800} fill="#4a3428" fontFamily="system-ui,sans-serif">
              {zone.label}
            </text>
          </g>
        </g>
      ))}

      <text x={200} y={44} textAnchor="middle" fontSize={11} fontWeight={800} fill="#8b7355" fontFamily="system-ui,sans-serif">
        MY HOME
      </text>
    </svg>
  );
}

export const AptDollhouseSvg = memo(AptDollhouseSvgInner);
