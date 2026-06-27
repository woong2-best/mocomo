"use client";

import type { ReactNode } from "react";
import type { ChibiAvatarConfig, ChibiPose } from "@/lib/apt/bondee/types";

const STROKE = "#1e1e1e";
const SW = 2.8;

function O({
  d,
  fill,
  stroke = STROKE,
  sw = SW,
  opacity = 1,
  children,
}: {
  d: string;
  fill: string;
  stroke?: string;
  sw?: number;
  opacity?: number;
  children?: ReactNode;
}) {
  return (
    <g opacity={opacity}>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      {children}
    </g>
  );
}

function Ell({
  cx,
  cy,
  rx,
  ry,
  fill,
  stroke = STROKE,
  sw = SW,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill: string;
  stroke?: string;
  sw?: number;
  opacity?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} opacity={opacity} />;
}

/** 바닥 타원 그림자 */
export function FloorShadow({ cx, cy, rx = 42, ry = 14 }: { cx: number; cy: number; rx?: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy + 8} rx={rx} ry={ry} fill="rgba(40,30,20,0.12)" />;
}

/** APT Resident — 참고 이미지 스타일 흰색 둥근 마스코트 */
export function MascotSvg({
  x,
  y,
  scale = 1,
  pose = "stand",
  avatar,
}: {
  x: number;
  y: number;
  scale?: number;
  pose?: ChibiPose;
  avatar?: ChibiAvatarConfig;
}) {
  const skin = "#fffdf6";
  const body = "#fffdf6";
  const leg = "#fffdf6";
  const sit = pose === "sit";
  const wave = pose === "wave";

  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <FloorShadow cx={0} cy={52} rx={28} ry={10} />
      {pose === "lie" || pose === "lie_prone" ? (
        <g>
          <Ell cx={-18} cy={8} rx={22} ry={22} fill={skin} />
          <O d="M 4 12 Q 38 8 48 18 Q 52 28 40 32 Q 10 36 -4 28 Z" fill={body} />
          <Ell cx={-8} cy={6} rx={3} ry={3.5} fill={STROKE} stroke="none" />
          <Ell cx={2} cy={6} rx={3} ry={3.5} fill={STROKE} stroke="none" />
        </g>
      ) : (
        <g>
          <Ell cx={0} cy={-28} rx={26} ry={26} fill={skin} />
          <O
            d={
              sit
                ? "M -18 2 Q -22 28 -8 38 Q 8 42 18 38 Q 28 28 18 2 Q 0 -4 -18 2 Z"
                : "M -20 0 Q -24 32 -10 48 Q 0 54 10 48 Q 24 32 20 0 Q 0 -8 -20 0 Z"
            }
            fill={body}
          />
          <O
            d={
              wave
                ? "M -28 -8 Q -38 -28 -32 -42 Q -24 -48 -18 -36 Q -14 -22 -22 -8 Z"
                : sit
                  ? "M -26 14 Q -34 28 -28 38 Q -20 40 -16 28 Q -14 18 -20 10 Z"
                  : "M -28 4 Q -36 22 -30 38 Q -22 44 -16 32 Q -12 16 -18 4 Z"
            }
            fill={skin}
          />
          <O
            d={
              sit
                ? "M 26 14 Q 34 28 28 38 Q 20 40 16 28 Q 14 18 20 10 Z"
                : "M 28 4 Q 36 22 30 38 Q 22 44 16 32 Q 12 16 18 4 Z"
            }
            fill={skin}
          />
          {!sit && (
            <>
              <O d="M -12 48 Q -14 62 -8 68 Q -2 70 2 68 Q 8 62 6 48 Z" fill={leg} />
              <O d="M 12 48 Q 10 62 16 68 Q 22 70 26 68 Q 32 62 30 48 Z" fill={leg} />
            </>
          )}
          <Ell cx={-9} cy={-30} rx={3.2} ry={3.8} fill={STROKE} stroke="none" />
          <Ell cx={9} cy={-30} rx={3.2} ry={3.8} fill={STROKE} stroke="none" />
          {avatar?.blush && (
            <>
              <Ell cx={-16} cy={-22} rx={5} ry={3} fill="#ffb4c8" stroke="none" opacity={0.55} />
              <Ell cx={16} cy={-22} rx={5} ry={3} fill="#ffb4c8" stroke="none" opacity={0.55} />
            </>
          )}
        </g>
      )}
    </g>
  );
}

export function SofaSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={18} rx={52} ry={14} />
      <O d="M -54 0 L 54 0 L 54 22 Q 54 32 44 32 L -44 32 Q -54 32 -54 22 Z" fill="#e85d5d" />
      <O d="M -54 -18 L -44 -32 L -20 -32 L -20 -18 Z" fill="#d94a4a" />
      <O d="M 54 -18 L 44 -32 L 20 -32 L 20 -18 Z" fill="#d94a4a" />
      <O d="M -18 -18 L 18 -18 L 18 0 L -18 0 Z" fill="#ff7a7a" />
      <path d="M -50 6 L 50 6" stroke="#fff" strokeWidth={2} opacity={0.35} strokeLinecap="round" />
    </g>
  );
}

export function BedSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={22} rx={58} ry={16} />
      <O d="M -58 0 L 58 0 L 58 28 L -58 28 Z" fill="#f0a8a8" />
      <O d="M -58 -8 L -58 0 L 58 0 L 58 -8 L 48 -24 L -48 -24 Z" fill="#fff" />
      <O d="M -48 -20 L -20 -20 L -20 0 L -48 0 Z" fill="#ffe8e8" />
      <O d="M 10 4 L 48 4 L 48 22 L 10 22 Z" fill="#ffd0d0" />
      <Ell cx={-34} cy={-12} rx={10} ry={8} fill="#fff" stroke={STROKE} sw={2} />
    </g>
  );
}

export function TvSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={16} rx={36} ry={10} />
      <O d="M -38 -28 L 38 -28 L 38 8 L -38 8 Z" fill="#3a4558" />
      <O d="M -32 -22 L 32 -22 L 32 2 L -32 2 Z" fill="#a8d8ff" />
      <O d="M -12 8 L 12 8 L 8 18 L -8 18 Z" fill="#6a7280" />
      <path d="M -20 -14 L -8 -6 L 10 -16" stroke="#fff" strokeWidth={2} fill="none" opacity={0.5} />
    </g>
  );
}

export function PlantSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={14} rx={18} ry={7} />
      <O d="M -14 0 L 14 0 L 12 16 L -12 16 Z" fill="#c4885a" />
      <O d="M 0 -28 Q -22 -8 -16 4 Q -8 -4 0 -28 Z" fill="#5cb868" />
      <O d="M 0 -28 Q 22 -8 16 4 Q 8 -4 0 -28 Z" fill="#6ecf78" />
      <O d="M 0 -32 Q -8 -18 0 -6 Q 8 -18 0 -32 Z" fill="#78d880" />
    </g>
  );
}

export function BookshelfSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <O d="M -36 -48 L 36 -48 L 36 8 L -36 8 Z" fill="#8fb765" />
      <path d="M -36 -32 L 36 -32 M -36 -16 L 36 -16 M -36 0 L 36 0" stroke={STROKE} strokeWidth={2} />
      {[
        [-24, -42, "#ffb4c8"],
        [-8, -42, "#a8d8ff"],
        [8, -42, "#ffe08a"],
        [20, -42, "#c8b8f0"],
        [-20, -26, "#ff9a6a"],
        [0, -26, "#78d880"],
        [16, -26, "#ffb4c8"],
        [-16, -10, "#a8d8ff"],
        [4, -10, "#ffe08a"],
        [20, -10, "#c8b8f0"],
      ].map(([bx, by, c], i) => (
        <rect key={i} x={Number(bx) - 6} y={Number(by)} width={12} height={14} rx={2} fill={String(c)} stroke={STROKE} strokeWidth={1.8} />
      ))}
    </g>
  );
}

export function LampSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={12} rx={14} ry={6} />
      <O d="M -16 -32 Q 0 -44 16 -32 L 12 -24 L -12 -24 Z" fill="#fff0a8" />
      <rect x={-3} y={-24} width={6} height={32} rx={3} fill="#d4b870" stroke={STROKE} strokeWidth={2} />
      <Ell cx={0} cy={10} rx={10} ry={4} fill="#b89850" stroke={STROKE} sw={2} />
      <ellipse cx={0} cy={-30} rx={28} ry={12} fill="rgba(255,240,160,0.35)" />
    </g>
  );
}

export function RugSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={0} rx={62} ry={28} fill="#eb9f9f" stroke={STROKE} strokeWidth={2.5} />
      <ellipse cx={0} cy={0} rx={48} ry={20} fill="none" stroke="#fff" strokeWidth={2} opacity={0.45} />
      <ellipse cx={0} cy={0} rx={34} ry={14} fill="none" stroke="#d87878" strokeWidth={1.5} opacity={0.5} />
    </g>
  );
}

export function CoffeeTableSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={8} rx={32} ry={10} />
      <O d="M -36 -6 L 36 -6 L 32 6 L -32 6 Z" fill="#d4a870" />
      <O d="M -28 -4 L -24 8 L -20 8 L -22 -4 Z" fill="#b88848" />
      <O d="M 28 -4 L 24 8 L 20 8 L 22 -4 Z" fill="#b88848" />
      <Ell cx={-8} cy={-10} rx={6} ry={4} fill="#fff" stroke={STROKE} sw={1.8} />
      <Ell cx={10} cy={-8} rx={5} ry={3} fill="#8b5a2b" stroke={STROKE} sw={1.5} />
    </g>
  );
}

export function FridgeSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={18} rx={24} ry={10} />
      <O d="M -24 -42 L 24 -42 L 24 16 L -24 16 Z" fill="#e8eef4" />
      <path d="M -24 -8 L 24 -8" stroke={STROKE} strokeWidth={2} />
      <rect x={14} y={-32} width={4} height={16} rx={2} fill="#a0b0c0" />
      <rect x={14} y={-2} width={4} height={10} rx={2} fill="#a0b0c0" />
    </g>
  );
}

export function DeskSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={10} rx={40} ry={12} />
      <O d="M -42 -8 L 42 -8 L 38 4 L -38 4 Z" fill="#e9c56d" />
      <rect x={-38} y={4} width={8} height={14} fill="#c9a050" stroke={STROKE} strokeWidth={1.8} />
      <rect x={30} y={4} width={8} height={14} fill="#c9a050" stroke={STROKE} strokeWidth={1.8} />
      <O d="M -12 -22 L 16 -22 L 16 -8 L -12 -8 Z" fill="#3a4558" />
      <O d="M -10 -20 L 14 -20 L 14 -10 L -10 -10 Z" fill="#a8d8ff" />
    </g>
  );
}

export function WasherSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={14} rx={28} ry={10} />
      <O d="M -28 -20 L 28 -20 L 28 14 L -28 14 Z" fill="#f0f0f0" />
      <Ell cx={0} cy={-2} rx={16} ry={14} fill="#d8e8f8" stroke={STROKE} sw={2} />
      <Ell cx={0} cy={-2} rx={10} ry={8} fill="#fff" stroke={STROKE} sw={1.8} />
    </g>
  );
}

export function ClockSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <Ell cx={0} cy={0} rx={18} ry={18} fill="#fff" />
      <Ell cx={0} cy={0} rx={14} ry={14} fill="#ffe8e8" />
      <path d="M 0 -8 L 0 0 L 6 4" stroke={STROKE} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );
}

export function GramophoneSvg({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <FloorShadow cx={0} cy={12} rx={22} ry={8} />
      <O d="M -8 0 L 8 0 L 6 14 L -6 14 Z" fill="#8b6914" />
      <O d="M 0 -28 Q 24 -20 20 0 Q 0 -8 0 -28 Z" fill="#c9a050" />
      <Ell cx={0} cy={-8} rx={4} ry={4} fill="#1e1e1e" stroke="none" />
    </g>
  );
}

/** 방 껍데기 — 참고 이미지 스타일 입체 컷away */
export function RoomShellSvg({
  wallTop,
  wallBottom,
  floorA,
  floorB,
  accent,
}: {
  wallTop: string;
  wallBottom: string;
  floorA: string;
  floorB: string;
  accent: string;
}) {
  const uid = `room-${wallTop.replace("#", "")}`;

  return (
    <g>
      <defs>
        <pattern id={`${uid}-checker`} width="36" height="36" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={floorA} />
          <rect x="18" width="18" height="18" fill={floorB} />
          <rect y="18" width="18" height="18" fill={floorB} />
          <rect x="18" y="18" width="18" height="18" fill={floorA} />
        </pattern>
        <pattern id={`${uid}-stripe`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <line x1="5" y1="0" x2="5" y2="10" stroke="rgba(0,0,0,0.05)" strokeWidth="1.2" />
        </pattern>
        <linearGradient id={`${uid}-win`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe8a0" />
          <stop offset="100%" stopColor="#ffb870" />
        </linearGradient>
      </defs>
      {/* 바닥 */}
      <path
        d="M 130 310 L 450 180 L 770 310 L 450 520 Z"
        fill={`url(#${uid}-checker)`}
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      {/* 왼쪽 벽 */}
      <path
        d="M 130 310 L 450 180 L 450 310 L 130 440 Z"
        fill={wallTop}
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d="M 130 310 L 450 310 L 450 380 L 130 510 Z" fill={wallBottom} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 130 310 L 450 310 L 450 380 L 130 510 Z" fill={`url(#${uid}-stripe)`} opacity={0.5} />
      {/* 오른쪽 벽 */}
      <path
        d="M 450 180 L 770 310 L 770 440 L 450 310 Z"
        fill={wallTop}
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d="M 450 310 L 770 440 L 770 510 L 450 380 Z" fill={wallBottom} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 450 310 L 770 440 L 770 510 L 450 380 Z" fill={`url(#${uid}-stripe)`} opacity={0.5} />
      {/* 벽-바닥 몰딩 */}
      <path d="M 130 310 L 450 180 L 770 310" fill="none" stroke={STROKE} strokeWidth={SW + 0.5} />
      <path d="M 130 310 L 450 520 L 770 310" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
      {/* 상단 장식 라인 (참고 이미지 머스터드/와avy 느낌) */}
      <path
        d="M 155 295 Q 200 278 250 288 Q 300 298 350 285 Q 400 272 450 278 Q 500 284 550 272 Q 600 260 650 275 Q 700 290 745 298"
        fill="none"
        stroke={accent}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.85}
      />
      {/* 창문 — 왼쪽 벽 */}
      <g>
        <rect x={175} y={228} width={88} height={62} rx={6} fill="#fff" stroke={STROKE} strokeWidth={SW} />
        <rect x={183} y={236} width={72} height={46} rx={4} fill={`url(#${uid}-win)`} stroke={STROKE} strokeWidth={2} />
        <path d="M 219 236 L 219 282 M 183 259 L 255 259" stroke={STROKE} strokeWidth={1.8} />
        <path d="M 168 248 Q 160 268 168 288" fill={accent} stroke={STROKE} strokeWidth={2} opacity={0.75} />
        <path d="M 268 248 Q 276 268 268 288" fill={accent} stroke={STROKE} strokeWidth={2} opacity={0.6} />
        <ellipse cx={219} cy={310} rx={55} ry={18} fill="rgba(255,248,200,0.35)" />
      </g>
      {/* 액자들 — 오른쪽 벽 */}
      <rect x={580} y={218} width={52} height={42} rx={4} fill="#fff" stroke={STROKE} strokeWidth={SW} />
      <rect x={588} y={226} width={36} height={26} rx={2} fill="#ffb4c8" stroke={STROKE} strokeWidth={1.5} />
      <rect x={648} y={232} width={38} height={32} rx={3} fill="#fff" stroke={STROKE} strokeWidth={2} />
      <rect x={654} y={238} width={26} height={20} rx={2} fill="#a8d8ff" stroke={STROKE} strokeWidth={1.5} />
      {/* 문 — 오른쪽 */}
      <path d="M 680 340 L 730 365 L 730 455 L 680 430 Z" fill="#f5ebe0" stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" />
      <Ell cx={718} cy={400} rx={4} ry={4} fill="#c9b898" stroke={STROKE} sw={1.5} />
      {/* APT HOME 간판 */}
      <text
        x={520}
        y={248}
        textAnchor="middle"
        fontSize={28}
        fontWeight={900}
        fill={accent}
        stroke={STROKE}
        strokeWidth={1.2}
        paintOrder="stroke"
        fontFamily="system-ui, sans-serif"
        letterSpacing={2}
      >
        APT HOME
      </text>
    </g>
  );
}
