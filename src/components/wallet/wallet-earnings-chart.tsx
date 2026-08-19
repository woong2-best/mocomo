"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";

type Point = { month: number; label: string; earned: number; withdrawn: number; net: number; cumulative: number };

type Props = {
  months: Point[];
  yearNet: number;
  className?: string;
};

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

function monthSlotX(index: number, innerW: number): number {
  return (index / 12) * innerW + innerW / 24;
}

function buildPath(values: number[], maxAbs: number, innerW: number, innerH: number): string {
  if (values.length === 0) return "";
  const midY = innerH / 2;
  const scale = maxAbs > 0 ? (innerH * 0.42) / maxAbs : 1;
  return values
    .map((v, i) => {
      const x = monthSlotX(i, innerW);
      const y = midY - v * scale;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function WalletEarningsChart({ months, yearNet, className }: Props) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const { cumulativePath, zeroY, maxBar, bars } = useMemo(() => {
    const cumValues = months.map((m) => m.cumulative);
    const maxAbs = Math.max(1, ...cumValues.map(Math.abs), ...months.map((m) => m.earned), ...months.map((m) => m.withdrawn));
    const path = buildPath(cumValues, maxAbs, innerW, innerH);
    const midY = PAD.top + innerH / 2;
    const barMax = Math.max(1, ...months.map((m) => Math.max(m.earned, m.withdrawn)));
    const bars = months.map((m, i) => {
      const x = PAD.left + monthSlotX(i, innerW);
      const bw = innerW / 14;
      const earnedH = (m.earned / barMax) * (innerH * 0.35);
      const withdrawnH = (m.withdrawn / barMax) * (innerH * 0.35);
      const baseY = PAD.top + innerH;
      return { ...m, x, bw, earnedH, withdrawnH, baseY };
    });
    return { cumulativePath: path, zeroY: midY, maxBar: barMax, bars };
  }, [months, innerH, innerW]);

  const trendUp = yearNet >= 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-3 overflow-hidden">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-sm font-semibold text-muted-foreground">누적 순수익 추이</p>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              trendUp ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"
            )}
          >
            {trendUp ? "▲ 상승" : "▼ 하락"} {formatUsd(Math.abs(yearNet))}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="연간 누적 수익 그래프">
          <line
            x1={PAD.left}
            y1={zeroY}
            x2={W - PAD.right}
            y2={zeroY}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeDasharray="4 4"
          />
          {cumulativePath ? (
            <path
              d={cumulativePath}
              fill="none"
              stroke={trendUp ? "#059669" : "#dc2626"}
              strokeWidth={2.5}
              transform={`translate(${PAD.left}, ${PAD.top})`}
            />
          ) : null}
          {months.map((m, i) => (
            <text
              key={m.month}
              x={PAD.left + monthSlotX(i, innerW)}
              y={H - 6}
              fontSize={10}
              fill="currentColor"
              fillOpacity={0.55}
            >
              {m.label.replace("월", "")}
            </text>
          ))}
        </svg>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 p-3 overflow-hidden">
        <p className="text-sm font-semibold text-muted-foreground px-1 pb-2">월별 수익 · 지출</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="월별 수익 지출 막대 그래프">
          {bars.map((b) => (
            <g key={b.month}>
              <rect
                x={b.x}
                y={b.baseY - b.earnedH}
                width={b.bw * 0.42}
                height={b.earnedH}
                rx={3}
                fill="#1B4A8C"
                fillOpacity={0.85}
              />
              <rect
                x={b.x + b.bw * 0.48}
                y={b.baseY - b.withdrawnH}
                width={b.bw * 0.42}
                height={b.withdrawnH}
                rx={3}
                fill="#C5522A"
                fillOpacity={0.85}
              />
              <text x={b.x + b.bw * 0.2} y={H - 6} fontSize={10} fill="currentColor" fillOpacity={0.55}>
                {b.label.replace("월", "")}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex gap-4 text-xs text-muted-foreground px-1 pt-1">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#1B4A8C]" /> 수익
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-[#C5522A]" /> 지출(출금)
          </span>
        </div>
      </div>
    </div>
  );
}
