"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import type { WalletEnrichedTransaction, WalletMonthBucket } from "@/lib/wallet-analytics";
import { WalletMonthDetailPanel } from "@/components/wallet/wallet-month-detail-panel";
import {
  buildBuckets,
  buildStepPathFromBuckets,
  buildYScale,
  clampViewport,
  downloadTextFile,
  exportTransactionsCsv,
  exportTransactionsJson,
  formatTooltipTime,
  pickGranularity,
  zoomAt,
  type Granularity,
  type TimeBucket,
  type YScaleMode,
} from "@/lib/wallet-timeseries";

type Props = {
  transactions: WalletEnrichedTransaction[];
  months: WalletMonthBucket[];
  year: number;
  yearNet: number;
  className?: string;
  onTransactionSelect?: (ids: string[]) => void;
};

const H = 240;
const BAR_H = 140;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };

const GRANULARITY_LABEL: Record<Granularity, string> = {
  month: "월",
  day: "일",
  hour: "시간",
  minute: "분",
  transaction: "거래",
};

export function WalletEarningsInteractiveChart({
  transactions,
  months,
  year,
  yearNet,
  className,
  onTransactionSelect,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [yMode, setYMode] = useState<YScaleMode>("linear");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [hover, setHover] = useState<{ px: number; py: number; bucket: TimeBucket | null } | null>(null);
  const [selecting, setSelecting] = useState<{ x0: number; x1: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startView: { startMs: number; endMs: number } } | null>(
    null
  );

  const bounds = useMemo(() => {
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year + 1, 0, 1).getTime() - 1;
    if (transactions.length === 0) return { minMs: yearStart, maxMs: yearEnd };
    const first = new Date(transactions[0].at).getTime();
    const last = new Date(transactions.at(-1)!.at).getTime();
    return { minMs: Math.min(yearStart, first), maxMs: Math.max(yearEnd, last) };
  }, [transactions, year]);

  const [viewport, setViewport] = useState(() => ({
    startMs: bounds.minMs,
    endMs: bounds.maxMs,
  }));

  useEffect(() => {
    setViewport({ startMs: bounds.minMs, endMs: bounds.maxMs });
  }, [bounds.minMs, bounds.maxMs, year]);

  useEffect(() => {
    setSelectedMonth(null);
  }, [year]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, entry.contentRect.width));
    });
    ro.observe(el);
    setWidth(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barInnerH = BAR_H - PAD.top - PAD.bottom;

  const granularity = pickGranularity(viewport.endMs - viewport.startMs);
  const buckets = useMemo(
    () => buildBuckets(transactions, viewport.startMs, viewport.endMs, granularity),
    [transactions, viewport, granularity]
  );

  const baselineCumulative = useMemo(() => {
    return transactions.filter((t) => new Date(t.at).getTime() < viewport.startMs).at(-1)?.cumulative ?? 0;
  }, [transactions, viewport.startMs]);

  const cumValues = useMemo(() => [baselineCumulative, ...buckets.map((b) => b.cumulative)], [baselineCumulative, buckets]);
  const barMax = Math.max(1, ...buckets.map((b) => Math.max(b.earned, b.withdrawn)));

  const { toY, zeroY } = useMemo(() => buildYScale(cumValues, innerH, yMode), [cumValues, innerH, yMode]);

  const xAt = useCallback(
    (ms: number) => {
      const range = viewport.endMs - viewport.startMs;
      if (range <= 0) return 0;
      return ((ms - viewport.startMs) / range) * innerW;
    },
    [viewport, innerW]
  );

  const msAt = useCallback(
    (px: number) => {
      const range = viewport.endMs - viewport.startMs;
      return viewport.startMs + (px / innerW) * range;
    },
    [viewport, innerW]
  );

  const cumulativePath = useMemo(
    () => buildStepPathFromBuckets(buckets, toY, xAt, baselineCumulative),
    [buckets, toY, xAt, baselineCumulative]
  );

  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - PAD.left;
      const centerMs = msAt(Math.max(0, Math.min(innerW, px)));
      const factor = e.deltaY > 0 ? 1.12 : 0.88;
      setViewport((v) => zoomAt(v, centerMs, factor, bounds));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [msAt, innerW, bounds]);

  const trendUp = yearNet >= 0;

  const plotMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (e.shiftKey) {
      setPanning({ startX: e.clientX, startView: { ...viewport } });
      return;
    }
    setSelecting({ x0: px, x1: px });
  };

  const plotMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const py = e.clientY - rect.top - PAD.top;

    if (panning) {
      const dx = e.clientX - panning.startX;
      const range = panning.startView.endMs - panning.startView.startMs;
      const deltaMs = (-dx / innerW) * range;
      setViewport(
        clampViewport(
          panning.startView.startMs + deltaMs,
          panning.startView.endMs + deltaMs,
          bounds.minMs,
          bounds.maxMs
        )
      );
      return;
    }

    if (selecting) {
      setSelecting({ ...selecting, x1: e.clientX - rect.left });
      return;
    }

    const ms = msAt(Math.max(0, Math.min(innerW, px)));
    const bucket =
      buckets.find((b) => ms >= b.startMs && ms <= b.endMs) ??
      buckets.reduce<TimeBucket | null>((best, b) => {
        const d = Math.min(Math.abs(ms - b.startMs), Math.abs(ms - b.endMs));
        if (!best) return b;
        const bd = Math.min(Math.abs(ms - best.startMs), Math.abs(ms - best.endMs));
        return d < bd ? b : best;
      }, null);

    setHover({ px: Math.max(0, Math.min(innerW, px)), py: Math.max(0, Math.min(innerH, py)), bucket });
  };

  const plotMouseUp = (e: React.MouseEvent) => {
    if (panning) {
      setPanning(null);
      return;
    }
    if (selecting) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x0 = Math.min(selecting.x0, selecting.x1) - PAD.left;
      const x1 = Math.max(selecting.x0, selecting.x1) - PAD.left;
      if (Math.abs(x1 - x0) > 12) {
        const startMs = msAt(Math.max(0, x0));
        const endMs = msAt(Math.min(innerW, x1));
        setViewport(clampViewport(startMs, endMs, bounds.minMs, bounds.maxMs));
      } else if (hover?.bucket?.transactions.length) {
        onTransactionSelect?.(hover.bucket.transactions.map((t) => t.id));
      }
      setSelecting(null);
      return;
    }
    if (hover?.bucket?.transactions.length) {
      onTransactionSelect?.(hover.bucket.transactions.map((t) => t.id));
    }
  };

  const resetZoom = () => setViewport({ startMs: bounds.minMs, endMs: bounds.maxMs });

  const exportFiltered = transactions.filter((t) => {
    const ms = new Date(t.at).getTime();
    return ms >= viewport.startMs && ms <= viewport.endMs;
  });

  const hoverYValue = hover
    ? (() => {
        const range = viewport.endMs - viewport.startMs;
        const ratio = 1 - hover.py / innerH;
        const { minV, maxV } = buildYScale(cumValues, innerH, yMode);
        if (yMode === "log") {
          const logMin = Math.log10(Math.max(minV, 0.01));
          const logMax = Math.log10(Math.max(maxV, 0.01));
          const lv = logMin + ratio * (logMax - logMin);
          return Math.pow(10, lv);
        }
        return minV + ratio * (maxV - minV);
      })()
    : 0;

  const selectedMonthLabel = selectedMonth ? months.find((m) => m.month === selectedMonth)?.label ?? `${selectedMonth}월` : "";

  return (
    <div ref={wrapRef} className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">누적 순수익 추이</p>
            <p className="text-[11px] text-muted-foreground/80">
              휠 확대 · 드래그 영역 선택 · Shift+드래그 이동 · 더블클릭 초기화 ·{" "}
              {GRANULARITY_LABEL[granularity]} 단위
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setYMode((m) => (m === "linear" ? "log" : "linear"))}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-border/60 bg-muted/30"
            >
              Y축 {yMode === "linear" ? "선형" : "로그"}
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-border/60 bg-muted/30"
            >
              전체 보기
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `wallet-${year}-export.csv`,
                  exportTransactionsCsv(exportFiltered, year),
                  "text/csv;charset=utf-8"
                )
              }
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-border/60 bg-muted/30"
            >
              CSV/Excel
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `wallet-${year}-export.json`,
                  exportTransactionsJson(exportFiltered, year),
                  "application/json"
                )
              }
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-border/60 bg-muted/30"
            >
              JSON
            </button>
            <span
              className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                trendUp ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"
              )}
            >
              {trendUp ? "▲" : "▼"} {formatUsd(Math.abs(yearNet))}
            </span>
          </div>
        </div>

        <div
          ref={plotRef}
          data-chart-plot
          className="relative select-none cursor-crosshair"
          onMouseDown={plotMouseDown}
          onMouseMove={plotMouseMove}
          onMouseUp={plotMouseUp}
          onMouseLeave={() => {
            setHover(null);
            setSelecting(null);
            setPanning(null);
          }}
          onDoubleClick={resetZoom}
        >
          <svg width={width} height={H} role="img" aria-label="누적 순수익 인터랙티브 그래프">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = PAD.top + innerH * t;
              const { minV, maxV } = buildYScale(cumValues, innerH, yMode);
              const val =
                yMode === "log"
                  ? Math.pow(10, Math.log10(Math.max(minV, 0.01)) + (1 - t) * (Math.log10(Math.max(maxV, 0.01)) - Math.log10(Math.max(minV, 0.01))))
                  : minV + (1 - t) * (maxV - minV);
              return (
                <g key={t}>
                  <line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke="currentColor" strokeOpacity={0.06} />
                  <text x={PAD.left - 6} y={y + 3} fontSize={9} textAnchor="end" fill="currentColor" fillOpacity={0.45}>
                    {formatUsd(val)}
                  </text>
                </g>
              );
            })}
            <line
              x1={PAD.left}
              y1={PAD.top + zeroY}
              x2={width - PAD.right}
              y2={PAD.top + zeroY}
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
            {buckets.map((b) =>
              b.transactions.length > 0 ? (
                <circle
                  key={b.key}
                  cx={PAD.left + xAt(b.endMs > b.startMs ? b.endMs : b.startMs)}
                  cy={PAD.top + toY(b.cumulative)}
                  r={granularity === "transaction" ? 3.5 : 2.5}
                  fill={trendUp ? "#059669" : "#dc2626"}
                  opacity={0.85}
                  className="pointer-events-none"
                />
              ) : null
            )}
            {hover ? (
              <g pointerEvents="none">
                <line
                  x1={PAD.left + hover.px}
                  y1={PAD.top}
                  x2={PAD.left + hover.px}
                  y2={PAD.top + innerH}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
                <line
                  x1={PAD.left}
                  y1={PAD.top + hover.py}
                  x2={width - PAD.right}
                  y2={PAD.top + hover.py}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeDasharray="3 3"
                />
              </g>
            ) : null}
            {selecting ? (
              <rect
                x={Math.min(selecting.x0, selecting.x1)}
                y={PAD.top}
                width={Math.abs(selecting.x1 - selecting.x0)}
                height={innerH}
                fill="#1B4A8C"
                fillOpacity={0.12}
                stroke="#1B4A8C"
                strokeOpacity={0.35}
              />
            ) : null}
          </svg>

          {hover?.bucket ? (
            <div
              className="absolute z-10 pointer-events-none rounded-xl border border-border/70 bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-lg max-w-[240px]"
              style={{
                left: Math.min(Math.max(PAD.left + hover.px + 8, 8), width - 248),
                top: Math.max(PAD.top + hover.py - 8, 8),
              }}
            >
              <p className="font-bold text-foreground">
                {formatTooltipTime(hover.bucket.startMs, granularity)}
              </p>
              <p className="text-muted-foreground mt-0.5">
                누적 {formatUsd(hover.bucket.cumulative)} · 구간 {formatUsd(hover.bucket.net)}
              </p>
              {hover.bucket.transactions.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border/50 pt-2">
                  {hover.bucket.transactions.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">{t.label}</span>
                      <span className={cn("shrink-0 font-bold", t.net >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {t.net >= 0 ? "+" : "-"}
                        {formatUsd(Math.abs(t.net))}
                      </span>
                    </li>
                  ))}
                  {hover.bucket.transactions.length > 8 ? (
                    <li className="text-muted-foreground">+{hover.bucket.transactions.length - 8}건 더</li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">거래 없음</p>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">클릭 → 아래 내역으로 이동</p>
            </div>
          ) : null}
        </div>

        {hover ? (
          <p className="text-[10px] text-muted-foreground px-1 pt-1">
            커서 Y축 ≈ {formatUsd(hoverYValue)} · X축{" "}
            {formatTooltipTime(msAt(hover.px), granularity)}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 px-2 py-3 space-y-1">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] font-semibold text-muted-foreground">월별 상세</p>
          <p className="text-[10px] text-muted-foreground">1~12월 탭 → 수익·지출 출처</p>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {months.map((m) => {
            const active = selectedMonth === m.month;
            const hasActivity = m.earned > 0 || m.withdrawn > 0;
            return (
              <button
                key={m.month}
                type="button"
                aria-pressed={active}
                aria-label={`${m.label} 거래 내역`}
                onClick={() => setSelectedMonth((prev) => (prev === m.month ? null : m.month))}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ease-out",
                  active
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.04] ring-2 ring-primary/30"
                    : hasActivity
                      ? "bg-muted/55 hover:bg-muted text-foreground hover:scale-[1.02]"
                      : "bg-transparent hover:bg-muted/30 text-muted-foreground"
                )}
              >
                {hasActivity ? (
                  <span
                    className={cn(
                      "absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full",
                      active ? "bg-primary-foreground" : m.net >= 0 ? "bg-emerald-500" : "bg-red-500"
                    )}
                  />
                ) : null}
                <span>{m.label.replace("월", "")}</span>
                <span className="text-[9px] opacity-70 mt-0.5">월</span>
              </button>
            );
          })}
        </div>
      </div>

      <WalletMonthDetailPanel
        year={year}
        month={selectedMonth}
        monthLabel={selectedMonthLabel}
        transactions={transactions}
        onClose={() => setSelectedMonth(null)}
      />

      <div className="rounded-2xl border border-border/60 bg-card/80 p-3 overflow-hidden">
        <p className="text-sm font-semibold text-muted-foreground px-1 pb-2">
          구간별 수익 · 지출 ({GRANULARITY_LABEL[granularity]} 단위)
        </p>
        <svg width={width} height={BAR_H} role="img" aria-label="구간별 수익 지출 막대 그래프">
          {buckets.map((b) => {
            const cx = PAD.left + xAt((b.startMs + b.endMs) / 2);
            const slotW = Math.max(4, innerW / Math.max(buckets.length, 1) - 2);
            const earnedH = (b.earned / barMax) * (barInnerH * 0.4);
            const withdrawnH = (b.withdrawn / barMax) * (barInnerH * 0.4);
            const baseY = PAD.top + barInnerH;
            return (
              <g key={`bar-${b.key}`}>
                <rect
                  x={cx - slotW * 0.22}
                  y={baseY - earnedH}
                  width={slotW * 0.42}
                  height={earnedH}
                  rx={2}
                  fill="#1B4A8C"
                  fillOpacity={0.85}
                />
                <rect
                  x={cx + slotW * 0.02}
                  y={baseY - withdrawnH}
                  width={slotW * 0.42}
                  height={withdrawnH}
                  rx={2}
                  fill="#C5522A"
                  fillOpacity={0.85}
                />
              </g>
            );
          })}
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
